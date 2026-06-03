import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { RequestContext, TenantService } from "../tenant/tenant.service";
import { Pagination, pageResult } from "../common/pagination";

export type TimelineItem = {
  id: string;
  kind: "ENTITY" | "RELATIONSHIP" | "EVIDENCE";
  timestamp: Date;
  title: string;
  description?: string | null;
};

@Injectable()
export class TimelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService
  ) {}

  async get(context: RequestContext, investigationId: string): Promise<TimelineItem[]>;
  async get(context: RequestContext, investigationId: string, pagination: Pagination): Promise<{ items: TimelineItem[]; total: number; page: number; pageSize: number }>;
  async get(context: RequestContext, investigationId: string, pagination?: Pagination): Promise<TimelineItem[] | { items: TimelineItem[]; total: number; page: number; pageSize: number }> {
    await this.tenant.ensure(context);
    const investigation = await this.prisma.investigation.findUnique({
      where: { id: investigationId, organizationId: context.organizationId }
    });
    if (!investigation) throw new NotFoundException("Investigation not found");
    const take = pagination ? pagination.page * pagination.pageSize : undefined;
    const [entities, relationships, evidence] = await Promise.all([
      this.prisma.entity.findMany({
        where: { investigationId },
        select: { id: true, type: true, name: true, description: true, firstSeen: true, createdAt: true },
        ...(take ? { take, orderBy: [{ firstSeen: { sort: "desc", nulls: "last" } }, { createdAt: "desc" as const }] } : {})
      }),
      this.prisma.relationship.findMany({
        where: { investigationId },
        select: {
          id: true,
          type: true,
          description: true,
          validFrom: true,
          sourceEntity: { select: { name: true } },
          targetEntity: { select: { name: true } }
        },
        ...(take ? { take, orderBy: { validFrom: "desc" as const } } : {})
      }),
      this.prisma.evidence.findMany({
        where: { investigationId },
        select: { id: true, title: true, notes: true, occurredAt: true, capturedAt: true },
        ...(take ? { take, orderBy: [{ occurredAt: { sort: "desc", nulls: "last" } }, { capturedAt: "desc" as const }] } : {})
      })
    ]);

    const items = [
      ...entities.map((entity) => ({
        id: entity.id,
        kind: "ENTITY" as const,
        timestamp: entity.firstSeen ?? entity.createdAt,
        title: `${entity.type}: ${entity.name}`,
        description: entity.description
      })),
      ...relationships.map((relationship) => ({
        id: relationship.id,
        kind: "RELATIONSHIP" as const,
        timestamp: relationship.validFrom,
        title: `${relationship.sourceEntity.name} ${relationship.type} ${relationship.targetEntity.name}`,
        description: relationship.description
      })),
      ...evidence.map((item) => ({
        id: item.id,
        kind: "EVIDENCE" as const,
        timestamp: item.occurredAt ?? item.capturedAt,
        title: item.title,
        description: item.notes
      }))
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const pageItems = pagination
      ? items.slice((pagination.page - 1) * pagination.pageSize, pagination.page * pagination.pageSize)
      : items;
    const total = pagination
      ? await Promise.all([
          this.prisma.entity.count({ where: { investigationId } }),
          this.prisma.relationship.count({ where: { investigationId } }),
          this.prisma.evidence.count({ where: { investigationId } })
        ]).then((counts) => counts.reduce((sum, count) => sum + count, 0))
      : items.length;
    return pageResult(pageItems, total, pagination);
  }
}
