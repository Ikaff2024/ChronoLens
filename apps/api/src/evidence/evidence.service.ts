import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma.service";
import { RequestContext, TenantService } from "../tenant/tenant.service";
import { CreateEvidenceDto } from "./evidence.dto";
import { evidenceHash } from "./evidence-hash";
import { pageArgs, pageResult, Pagination } from "../common/pagination";

@Injectable()
export class EvidenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService
  ) {}

  async create(context: RequestContext, dto: CreateEvidenceDto) {
    this.tenant.assertCanWrite(context);
    await this.tenant.ensure(context);
    const investigation = await this.prisma.investigation.findUnique({
      where: { id: dto.investigationId, organizationId: context.organizationId }
    });
    if (!investigation) throw new NotFoundException("Investigation not found");
    if (dto.url) {
      const existing = await this.prisma.evidence.findFirst({
        where: { investigationId: dto.investigationId, url: dto.url }
      });
      if (existing) throw new ConflictException("Evidence URL already exists in this investigation");
    }
    const evidence = await this.prisma.evidence.create({
      data: { ...dto, contentHash: evidenceHash(dto) }
    });
    await this.audit.record(context, {
      action: AuditAction.EVIDENCE_CREATED,
      resourceType: "Evidence",
      resourceId: evidence.id,
      investigationId: evidence.investigationId,
      details: { title: evidence.title, source: evidence.source }
    });
    return evidence;
  }

  async list(context: RequestContext, investigationId: string, pagination?: Pagination) {
    await this.tenant.ensure(context);
    const investigation = await this.prisma.investigation.findUnique({
      where: { id: investigationId, organizationId: context.organizationId }
    });
    if (!investigation) throw new NotFoundException("Investigation not found");
    const where = { investigationId };
    const findItems = () => this.prisma.evidence.findMany({ where, orderBy: { capturedAt: "desc" }, ...pageArgs(pagination) });
    if (!pagination) return findItems();
    const [items, total] = await Promise.all([
      findItems(),
      this.prisma.evidence.count({ where })
    ]);
    return pageResult(items, total, pagination);
  }

  async verify(context: RequestContext, evidenceId: string) {
    await this.tenant.ensure(context);
    const evidence = await this.prisma.evidence.findFirst({
      where: { id: evidenceId, investigation: { organizationId: context.organizationId } }
    });
    if (!evidence) throw new NotFoundException("Evidence not found");
    const computedHash = evidenceHash(evidence);
    const result = {
      evidenceId: evidence.id,
      storedHash: evidence.contentHash,
      computedHash,
      integrity: evidence.contentHash ? (evidence.contentHash === computedHash ? "VALID" : "MISMATCH") : "UNHASHED"
    };
    await this.audit.record(context, {
      action: AuditAction.EVIDENCE_INTEGRITY_VERIFIED,
      resourceType: "Evidence",
      resourceId: evidence.id,
      investigationId: evidence.investigationId,
      details: { integrity: result.integrity }
    });
    return result;
  }

  async backfill(context: RequestContext, investigationId?: string) {
    this.tenant.assertCanWrite(context);
    await this.tenant.ensure(context);
    if (investigationId) {
      const investigation = await this.prisma.investigation.findUnique({
        where: { id: investigationId, organizationId: context.organizationId }
      });
      if (!investigation) throw new NotFoundException("Investigation not found");
    }
    const evidence = await this.prisma.evidence.findMany({
      where: {
        contentHash: null,
        investigation: {
          organizationId: context.organizationId,
          ...(investigationId ? { id: investigationId } : {})
        }
      }
    });
    for (const item of evidence) {
      const contentHash = evidenceHash(item);
      await this.prisma.evidence.update({ where: { id: item.id }, data: { contentHash } });
      await this.audit.record(context, {
        action: AuditAction.EVIDENCE_HASH_BACKFILLED,
        resourceType: "Evidence",
        resourceId: item.id,
        investigationId: item.investigationId,
        details: { contentHash }
      });
    }
    return { backfilled: evidence.length };
  }
}
