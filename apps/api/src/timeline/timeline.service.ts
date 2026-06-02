import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { RequestContext, TenantService } from "../tenant/tenant.service";

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

  async get(context: RequestContext, investigationId: string): Promise<TimelineItem[]> {
    await this.tenant.ensure(context);
    const investigation = await this.prisma.investigation.findUnique({
      where: { id: investigationId, organizationId: context.organizationId }
    });
    if (!investigation) throw new NotFoundException("Investigation not found");
    const [entities, relationships, evidence] = await Promise.all([
      this.prisma.entity.findMany({ where: { investigationId } }),
      this.prisma.relationship.findMany({
        where: { investigationId },
        include: { sourceEntity: true, targetEntity: true }
      }),
      this.prisma.evidence.findMany({ where: { investigationId } })
    ]);

    return [
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
  }
}
