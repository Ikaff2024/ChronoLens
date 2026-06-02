import { Injectable } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { RequestContext, TenantService } from "../tenant/tenant.service";

type AuditEntry = {
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  investigationId?: string;
  details?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService
  ) {}

  async record(context: RequestContext, entry: AuditEntry) {
    await this.tenant.ensure(context);
    return this.prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actorId: context.actorId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        investigationId: entry.investigationId,
        details: entry.details ?? {}
      }
    });
  }

  async list(context: RequestContext, investigationId: string) {
    await this.tenant.ensure(context);
    return this.prisma.auditLog.findMany({
      where: { organizationId: context.organizationId, investigationId },
      orderBy: { createdAt: "desc" },
      take: 100
    }).then(async (entries) => {
      const actors = await this.prisma.user.findMany({
        where: { id: { in: [...new Set(entries.map((entry) => entry.actorId))] } },
        select: { id: true, name: true, email: true }
      });
      const byId = new Map(actors.map((actor) => [actor.id, actor]));
      return entries.map((entry) => ({ ...entry, actor: byId.get(entry.actorId) }));
    });
  }
}
