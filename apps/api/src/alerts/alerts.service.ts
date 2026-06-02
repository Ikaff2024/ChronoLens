import { Injectable, NotFoundException } from "@nestjs/common";
import { RelationshipType } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { RequestContext, TenantService } from "../tenant/tenant.service";
import { TimelineService } from "../timeline/timeline.service";

export type Alert = {
  id: string;
  rule: string;
  severity: "INFO" | "MEDIUM" | "HIGH";
  title: string;
  explanation: string;
  resourceIds: string[];
};

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly timeline: TimelineService
  ) {}

  async list(context: RequestContext, investigationId: string): Promise<Alert[]> {
    await this.tenant.ensure(context);
    const investigation = await this.prisma.investigation.findUnique({
      where: { id: investigationId, organizationId: context.organizationId },
      include: { relationships: true, evidence: true }
    });
    if (!investigation) throw new NotFoundException("Investigation not found");

    const timeline = await this.timeline.get(context, investigationId);
    const alerts: Alert[] = [];
    const recentThreshold = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentRelationships = investigation.relationships.filter((item) => item.validFrom.getTime() >= recentThreshold);
    const partnerships = recentRelationships.filter((item) => item.type === RelationshipType.PARTNER);
    const recentTimeline = timeline.filter((item) => item.timestamp.getTime() >= recentThreshold);

    if (partnerships.length) {
      alerts.push({
        id: "recent-partnership",
        rule: "RECENT_PARTNERSHIP",
        severity: partnerships.length >= 2 ? "HIGH" : "MEDIUM",
        title: "Partenariat recent detecte",
        explanation: `${partnerships.length} relation(s) PARTNER valide(s) dans les 30 derniers jours.`,
        resourceIds: partnerships.map((item) => item.id)
      });
    }

    if (recentTimeline.length >= 3) {
      alerts.push({
        id: "activity-spike",
        rule: "RECENT_ACTIVITY_SPIKE",
        severity: recentTimeline.length >= 6 ? "HIGH" : "MEDIUM",
        title: "Concentration d'activite recente",
        explanation: `${recentTimeline.length} evenement(s) temporel(s) enregistres dans les 30 derniers jours.`,
        resourceIds: recentTimeline.map((item) => item.id)
      });
    }

    if (investigation.relationships.length && investigation.evidence.length === 0) {
      alerts.push({
        id: "missing-evidence",
        rule: "RELATIONSHIP_WITHOUT_EVIDENCE",
        severity: "HIGH",
        title: "Relations sans preuve rattachee",
        explanation: "Le dossier contient des relations mais aucune preuve publique enregistree.",
        resourceIds: investigation.relationships.map((item) => item.id)
      });
    }

    return alerts;
  }
}
