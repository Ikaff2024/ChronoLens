import { ForbiddenException, Injectable } from "@nestjs/common";
import { OrganizationRole } from "@prisma/client";
import { PrismaService } from "../prisma.service";

export const PILOT_ORGANIZATION_ID = "pilot-org";
export const PILOT_ACTOR_ID = "pilot-analyst";

export type RequestContext = {
  organizationId: string;
  actorId: string;
  role: OrganizationRole;
};

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async ensure(context: RequestContext) {
    await this.prisma.organization.upsert({
      where: { id: context.organizationId },
      update: {},
      create: {
        id: context.organizationId,
        name: context.organizationId === PILOT_ORGANIZATION_ID ? "ChronoLens Pilot" : context.organizationId
      }
    });

    await this.prisma.investigation.updateMany({
      where: { organizationId: null },
      data: { organizationId: PILOT_ORGANIZATION_ID }
    });
  }

  assertCanWrite(context: RequestContext) {
    if (context.role === OrganizationRole.VIEWER) {
      throw new ForbiddenException("Viewer role is read-only");
    }
  }
}
