import { ForbiddenException } from "@nestjs/common";
import { OrganizationRole } from "@prisma/client";
import { TenantService } from "../src/tenant/tenant.service";

describe("TenantService", () => {
  const service = new TenantService({} as never);

  it("keeps viewers read-only", () => {
    expect(() =>
      service.assertCanWrite({
        organizationId: "pilot-org",
        actorId: "viewer",
        role: OrganizationRole.VIEWER
      })
    ).toThrow(ForbiddenException);
  });
});
