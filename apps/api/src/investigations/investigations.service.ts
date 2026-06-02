import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, InvestigationStatus, OrganizationRole } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma.service";
import { RequestContext, TenantService } from "../tenant/tenant.service";
import { CreateInvestigationDto, PurgeInvestigationDto, UpdateInvestigationDto } from "./investigations.dto";
import { pageArgs, pageResult, Pagination } from "../common/pagination";

@Injectable()
export class InvestigationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService
  ) {}

  async list(context: RequestContext, pagination?: Pagination) {
    await this.tenant.ensure(context);
    const where = { organizationId: context.organizationId };
    const findItems = () => this.prisma.investigation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      ...pageArgs(pagination),
      include: {
        _count: { select: { entities: true, relationships: true, evidence: true } }
      }
      });
    if (!pagination) return findItems();
    const [items, total] = await Promise.all([
      findItems(),
      this.prisma.investigation.count({ where })
    ]);
    return pageResult(items, total, pagination);
  }

  async get(context: RequestContext, id: string) {
    await this.tenant.ensure(context);
    const investigation = await this.prisma.investigation.findUnique({
      where: { id, organizationId: context.organizationId },
      include: {
        entities: { orderBy: { createdAt: "desc" } },
        relationships: {
          orderBy: { validFrom: "desc" },
          include: { sourceEntity: true, targetEntity: true }
        },
        evidence: { orderBy: { capturedAt: "desc" } }
      }
    });
    if (!investigation) throw new NotFoundException("Investigation not found");
    return investigation;
  }

  async create(context: RequestContext, dto: CreateInvestigationDto) {
    this.tenant.assertCanWrite(context);
    await this.tenant.ensure(context);
    const existing = await this.prisma.investigation.findFirst({
      where: {
        organizationId: context.organizationId,
        title: { equals: dto.title, mode: "insensitive" }
      }
    });
    if (existing) throw new ConflictException("Investigation title already exists in this organization");
    const investigation = await this.prisma.investigation.create({
      data: { ...dto, organizationId: context.organizationId, tags: dto.tags ?? [] }
    });
    await this.audit.record(context, {
      action: AuditAction.INVESTIGATION_CREATED,
      resourceType: "Investigation",
      resourceId: investigation.id,
      investigationId: investigation.id,
      details: { title: investigation.title }
    });
    return investigation;
  }

  async update(context: RequestContext, id: string, dto: UpdateInvestigationDto) {
    this.tenant.assertCanWrite(context);
    await this.get(context, id);
    const investigation = await this.prisma.investigation.update({ where: { id }, data: dto });
    await this.audit.record(context, {
      action: AuditAction.INVESTIGATION_UPDATED,
      resourceType: "Investigation",
      resourceId: id,
      investigationId: id,
      details: { ...dto }
    });
    return investigation;
  }

  async archive(context: RequestContext, id: string) {
    this.tenant.assertCanWrite(context);
    const current = await this.get(context, id);
    if (current.status === InvestigationStatus.ARCHIVED) return current;
    const investigation = await this.prisma.investigation.update({
      where: { id },
      data: { status: InvestigationStatus.ARCHIVED }
    });
    await this.audit.record(context, {
      action: AuditAction.INVESTIGATION_ARCHIVED,
      resourceType: "Investigation",
      resourceId: id,
      investigationId: id,
      details: { previousStatus: current.status }
    });
    return investigation;
  }

  async governance(context: RequestContext, id: string) {
    const investigation = await this.get(context, id);
    const reviewDueAt = new Date(investigation.updatedAt);
    reviewDueAt.setUTCFullYear(reviewDueAt.getUTCFullYear() + 1);
    const retentionEndsAt = new Date(investigation.updatedAt);
    retentionEndsAt.setUTCFullYear(retentionEndsAt.getUTCFullYear() + 2);
    return {
      investigationId: investigation.id,
      status: investigation.status,
      automaticDeletion: false,
      reviewDueAt: investigation.status === InvestigationStatus.ARCHIVED ? null : reviewDueAt,
      retentionEndsAt: investigation.status === InvestigationStatus.ARCHIVED ? retentionEndsAt : null,
      policy: investigation.status === InvestigationStatus.ARCHIVED
        ? "Archived dossiers are retained for two years after their last update."
        : "Active and draft dossiers require an annual review."
    };
  }

  async retentionDue(context: RequestContext) {
    await this.tenant.ensure(context);
    const threshold = new Date();
    threshold.setUTCFullYear(threshold.getUTCFullYear() - 2);
    return this.prisma.investigation.findMany({
      where: {
        organizationId: context.organizationId,
        status: InvestigationStatus.ARCHIVED,
        updatedAt: { lte: threshold }
      },
      orderBy: { updatedAt: "asc" },
      select: { id: true, title: true, updatedAt: true }
    });
  }

  async purge(context: RequestContext, id: string, dto: PurgeInvestigationDto) {
    if (context.role !== OrganizationRole.OWNER) throw new ForbiddenException("Owner role required");
    const investigation = await this.get(context, id);
    if (investigation.status !== InvestigationStatus.ARCHIVED) {
      throw new BadRequestException("Only archived investigations can be purged");
    }
    const retentionEndsAt = new Date(investigation.updatedAt);
    retentionEndsAt.setUTCFullYear(retentionEndsAt.getUTCFullYear() + 2);
    if (retentionEndsAt > new Date()) throw new BadRequestException("Investigation retention period has not ended");
    if (!dto.exportAcknowledged) throw new BadRequestException("Export acknowledgement is required");
    if (dto.confirmation !== `PURGE ${id}`) throw new BadRequestException(`Confirmation must be PURGE ${id}`);
    await this.prisma.investigation.delete({ where: { id } });
    await this.audit.record(context, {
      action: AuditAction.INVESTIGATION_PURGED,
      resourceType: "Investigation",
      resourceId: id,
      details: { title: investigation.title, retentionEndsAt: retentionEndsAt.toISOString(), exportAcknowledged: true }
    });
    return { purged: true, investigationId: id };
  }
}
