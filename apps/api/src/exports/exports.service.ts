import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { RequestContext, TenantService } from "../tenant/tenant.service";
import { TimelineService } from "../timeline/timeline.service";

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly timeline: TimelineService
  ) {}

  async bundle(context: RequestContext, investigationId: string) {
    await this.tenant.ensure(context);
    const investigation = await this.prisma.investigation.findUnique({
      where: { id: investigationId, organizationId: context.organizationId },
      include: {
        entities: { orderBy: { createdAt: "asc" } },
        relationships: {
          orderBy: { validFrom: "asc" },
          include: { sourceEntity: true, targetEntity: true }
        },
        evidence: { orderBy: { capturedAt: "asc" } }
      }
    });
    if (!investigation) throw new NotFoundException("Investigation not found");
    return {
      exportedAt: new Date().toISOString(),
      organizationId: context.organizationId,
      investigation,
      timeline: await this.timeline.get(context, investigationId)
    };
  }

  async timelineCsv(context: RequestContext, investigationId: string) {
    const bundle = await this.bundle(context, investigationId);
    const rows = [
      ["timestamp", "kind", "title", "description"],
      ...bundle.timeline.map((item) => [
        item.timestamp.toISOString(),
        item.kind,
        item.title,
        item.description ?? ""
      ])
    ];
    return rows.map((row) => row.map(csvCell).join(",")).join("\n");
  }
}
