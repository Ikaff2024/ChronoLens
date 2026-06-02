import { Module } from "@nestjs/common";
import { EntitiesController } from "./entities/entities.controller";
import { EntitiesService } from "./entities/entities.service";
import { EvidenceController } from "./evidence/evidence.controller";
import { EvidenceService } from "./evidence/evidence.service";
import { HealthController } from "./health.controller";
import { InvestigationsController } from "./investigations/investigations.controller";
import { InvestigationsService } from "./investigations/investigations.service";
import { PrismaService } from "./prisma.service";
import { RelationshipsController } from "./relationships/relationships.controller";
import { RelationshipsService } from "./relationships/relationships.service";
import { TimelineController } from "./timeline/timeline.controller";
import { TimelineService } from "./timeline/timeline.service";
import { AuditController } from "./audit/audit.controller";
import { AuditService } from "./audit/audit.service";
import { TenantService } from "./tenant/tenant.service";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { ExportsController } from "./exports/exports.controller";
import { ExportsService } from "./exports/exports.service";
import { AlertsController } from "./alerts/alerts.controller";
import { AlertsService } from "./alerts/alerts.service";
import { MembersController } from "./auth/members.controller";

@Module({
  controllers: [
    HealthController,
    InvestigationsController,
    EntitiesController,
    RelationshipsController,
    EvidenceController,
    TimelineController,
    AuditController,
    AuthController,
    ExportsController,
    AlertsController,
    MembersController
  ],
  providers: [
    PrismaService,
    InvestigationsService,
    EntitiesService,
    RelationshipsService,
    EvidenceService,
    TimelineService,
    AuditService,
    TenantService,
    AuthService,
    ExportsService,
    AlertsService
  ]
})
export class AppModule {}
