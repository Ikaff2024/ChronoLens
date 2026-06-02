import { ForbiddenException } from "@nestjs/common";
import { OrganizationRole } from "@prisma/client";
import { AuthService } from "../src/auth/auth.service";

describe("AuthService member administration", () => {
  const prisma = { membership: { findMany: jest.fn() } };
  const service = new AuthService(prisma as never, {} as never, {} as never);

  it("rejects member listing for viewers", async () => {
    await expect(
      service.listMembers({
        organizationId: "pilot-org",
        actorId: "viewer",
        role: OrganizationRole.VIEWER
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects login while an account is temporarily locked", async () => {
    const lockedService = new AuthService({
      session: { deleteMany: jest.fn() },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          lockedUntil: new Date(Date.now() + 60_000),
          memberships: []
        })
      }
    } as never, { ensure: jest.fn() } as never, {} as never);
    jest.spyOn(lockedService, "ensurePilotAccount").mockResolvedValue();

    await expect(lockedService.login("locked@chronolens.local", "irrelevant-password"))
      .rejects.toMatchObject({ status: 429 });
  });

  it("purges expired sessions and records the maintenance action", async () => {
    const audit = { record: jest.fn() };
    const purgeService = new AuthService({
      session: { deleteMany: jest.fn().mockResolvedValue({ count: 3 }) }
    } as never, {} as never, audit as never);

    await expect(
      purgeService.purgeExpiredSessions({
        organizationId: "pilot-org",
        actorId: "owner",
        role: OrganizationRole.OWNER
      })
    ).resolves.toEqual({ deleted: 3 });
    expect(audit.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "SESSIONS_EXPIRED_PURGED", details: { deleted: 3 } })
    );
  });
});
