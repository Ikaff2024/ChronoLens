import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, EntityType, Prisma } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma.service";
import { RequestContext, TenantService } from "../tenant/tenant.service";
import { CreateEntityDto, ImportEntitiesCsvDto } from "./entities.dto";
import { pageArgs, pageResult, Pagination } from "../common/pagination";

@Injectable()
export class EntitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService
  ) {}

  private async assertInvestigation(context: RequestContext, investigationId: string) {
    await this.tenant.ensure(context);
    const investigation = await this.prisma.investigation.findUnique({
      where: { id: investigationId, organizationId: context.organizationId }
    });
    if (!investigation) throw new NotFoundException("Investigation not found");
  }

  async list(context: RequestContext, investigationId: string, query?: string, pagination?: Pagination) {
    await this.assertInvestigation(context, investigationId);
    const where: Prisma.EntityWhereInput = {
        investigationId,
        ...(query ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } }
          ]
        } : {})
      };
    const findItems = () => this.prisma.entity.findMany({
      where,
      orderBy: { updatedAt: "desc" }
      , ...pageArgs(pagination) });
    if (!pagination) return findItems();
    const [items, total] = await Promise.all([
      findItems(),
      this.prisma.entity.count({ where })
    ]);
    return pageResult(items, total, pagination);
  }

  async create(context: RequestContext, dto: CreateEntityDto) {
    this.tenant.assertCanWrite(context);
    await this.assertInvestigation(context, dto.investigationId);
    const existing = await this.prisma.entity.findFirst({
      where: {
        investigationId: dto.investigationId,
        type: dto.type,
        name: { equals: dto.name, mode: "insensitive" }
      }
    });
    if (existing) throw new ConflictException("Entity already exists in this investigation");
    const entity = await this.prisma.entity.create({
      data: {
        ...dto,
        aliases: dto.aliases ?? [],
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue
      }
    });
    await this.audit.record(context, {
      action: AuditAction.ENTITY_CREATED,
      resourceType: "Entity",
      resourceId: entity.id,
      investigationId: entity.investigationId,
      details: { name: entity.name, type: entity.type }
    });
    return entity;
  }

  async importCsv(context: RequestContext, dto: ImportEntitiesCsvDto) {
    this.tenant.assertCanWrite(context);
    await this.assertInvestigation(context, dto.investigationId);
    let rows: Record<string, string>[];
    try {
      rows = parse(dto.csv, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    } catch {
      throw new BadRequestException("Invalid CSV document");
    }
    if (!rows.length) throw new BadRequestException("CSV document is empty");
    if (rows.length > 500) throw new BadRequestException("CSV import is limited to 500 entities");

    const entities = rows.map((row, index) => {
      const type = row.type?.toUpperCase() as EntityType;
      if (!row.name || !Object.values(EntityType).includes(type)) {
        throw new BadRequestException(`Invalid CSV row ${index + 2}: expected name and valid type`);
      }
      const confidence = row.confidence ? Number(row.confidence) : 1;
      if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
        throw new BadRequestException(`Invalid CSV row ${index + 2}: confidence must be between 0 and 1`);
      }
      return {
        investigationId: dto.investigationId,
        type,
        name: row.name,
        aliases: row.aliases ? row.aliases.split("|").map((value) => value.trim()).filter(Boolean) : [],
        description: row.description || undefined,
        metadata: {},
        confidence,
        firstSeen: row.firstSeen ? new Date(row.firstSeen) : undefined,
        lastSeen: row.lastSeen ? new Date(row.lastSeen) : undefined
      };
    });

    if (entities.some((entity) => Number.isNaN(entity.firstSeen?.getTime()) || Number.isNaN(entity.lastSeen?.getTime()))) {
      throw new BadRequestException("CSV contains an invalid date");
    }

    const existing = await this.prisma.entity.findMany({
      where: { investigationId: dto.investigationId },
      select: { type: true, name: true }
    });
    const known = new Set(existing.map((entity) => `${entity.type}:${entity.name.toLowerCase()}`));
    const deduplicated = entities.filter((entity) => {
      const key = `${entity.type}:${entity.name.toLowerCase()}`;
      if (known.has(key)) return false;
      known.add(key);
      return true;
    });
    const result = await this.prisma.entity.createMany({ data: deduplicated });
    const skipped = entities.length - result.count;
    await this.audit.record(context, {
      action: AuditAction.ENTITIES_IMPORTED,
      resourceType: "Entity",
      investigationId: dto.investigationId,
      details: { count: result.count, skipped }
    });
    return { imported: result.count, skipped };
  }
}
