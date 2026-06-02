import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma.service";
import { RequestContext, TenantService } from "../tenant/tenant.service";
import { CreateRelationshipDto } from "./relationships.dto";
import { pageArgs, pageResult, Pagination } from "../common/pagination";

@Injectable()
export class RelationshipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService
  ) {}

  async list(context: RequestContext, investigationId: string, pagination?: Pagination) {
    await this.tenant.ensure(context);
    const investigation = await this.prisma.investigation.findUnique({
      where: { id: investigationId, organizationId: context.organizationId }
    });
    if (!investigation) throw new NotFoundException("Investigation not found");
    const where = { investigationId };
    const findItems = () => this.prisma.relationship.findMany({
      where,
      include: { sourceEntity: true, targetEntity: true },
      orderBy: { validFrom: "desc" },
      ...pageArgs(pagination)
    });
    if (!pagination) return findItems();
    const [items, total] = await Promise.all([findItems(), this.prisma.relationship.count({ where })]);
    return pageResult(items, total, pagination);
  }

  async create(context: RequestContext, dto: CreateRelationshipDto) {
    this.tenant.assertCanWrite(context);
    await this.tenant.ensure(context);
    if (dto.sourceEntityId === dto.targetEntityId) {
      throw new BadRequestException("A relationship must connect two distinct entities");
    }
    if (dto.validTo && dto.validTo < dto.validFrom) {
      throw new BadRequestException("validTo must be after validFrom");
    }
    const investigation = await this.prisma.investigation.findUnique({
      where: { id: dto.investigationId, organizationId: context.organizationId }
    });
    if (!investigation) throw new NotFoundException("Investigation not found");
    const entities = await this.prisma.entity.count({
      where: { id: { in: [dto.sourceEntityId, dto.targetEntityId] }, investigationId: dto.investigationId }
    });
    if (entities !== 2) throw new BadRequestException("Both entities must belong to the investigation");
    const relationship = await this.prisma.relationship.create({ data: dto });
    await this.audit.record(context, {
      action: AuditAction.RELATIONSHIP_CREATED,
      resourceType: "Relationship",
      resourceId: relationship.id,
      investigationId: relationship.investigationId,
      details: { type: relationship.type }
    });
    return relationship;
  }
}
