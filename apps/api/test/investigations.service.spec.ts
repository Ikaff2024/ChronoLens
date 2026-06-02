import { BadRequestException, ConflictException } from "@nestjs/common";
import { InvestigationStatus, OrganizationRole } from "@prisma/client";
import { InvestigationsService } from "../src/investigations/investigations.service";

describe("InvestigationsService", () => {
  const prisma = { investigation: { findFirst: jest.fn().mockResolvedValue({ id: "existing" }) } };
  const tenant = { assertCanWrite: jest.fn(), ensure: jest.fn() };
  const service = new InvestigationsService(prisma as never, tenant as never, {} as never);

  it("rejects duplicate titles inside an organization", async () => {
    await expect(
      service.create(
        { organizationId: "pilot-org", actorId: "owner", role: OrganizationRole.OWNER },
        { title: "Due diligence - Atlas Energy" }
      )
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("archives an active investigation and records the action", async () => {
    const archivePrisma = {
      investigation: {
        findUnique: jest.fn().mockResolvedValue({ id: "investigation", status: InvestigationStatus.ACTIVE }),
        update: jest.fn().mockResolvedValue({ id: "investigation", status: InvestigationStatus.ARCHIVED })
      }
    };
    const audit = { record: jest.fn() };
    const archiveService = new InvestigationsService(archivePrisma as never, tenant as never, audit as never);

    await expect(
      archiveService.archive(
        { organizationId: "pilot-org", actorId: "owner", role: OrganizationRole.OWNER },
        "investigation"
      )
    ).resolves.toMatchObject({ status: InvestigationStatus.ARCHIVED });
    expect(audit.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "INVESTIGATION_ARCHIVED" })
    );
  });

  it("keeps archive idempotent", async () => {
    const archived = { id: "investigation", status: InvestigationStatus.ARCHIVED };
    const archivePrisma = {
      investigation: {
        findUnique: jest.fn().mockResolvedValue(archived),
        update: jest.fn()
      }
    };
    const archiveService = new InvestigationsService(archivePrisma as never, tenant as never, { record: jest.fn() } as never);

    await expect(
      archiveService.archive(
        { organizationId: "pilot-org", actorId: "owner", role: OrganizationRole.OWNER },
        "investigation"
      )
    ).resolves.toEqual(archived);
    expect(archivePrisma.investigation.update).not.toHaveBeenCalled();
  });

  it("computes retention for archived investigations", async () => {
    const governanceService = new InvestigationsService({
      investigation: {
        findUnique: jest.fn().mockResolvedValue({
          id: "investigation",
          status: InvestigationStatus.ARCHIVED,
          updatedAt: new Date("2026-06-02T00:00:00.000Z")
        })
      }
    } as never, tenant as never, {} as never);

    await expect(
      governanceService.governance(
        { organizationId: "pilot-org", actorId: "owner", role: OrganizationRole.OWNER },
        "investigation"
      )
    ).resolves.toMatchObject({
      automaticDeletion: false,
      reviewDueAt: null,
      retentionEndsAt: new Date("2028-06-02T00:00:00.000Z")
    });
  });

  it("requires export acknowledgement before purge", async () => {
    const purgeService = new InvestigationsService({
      investigation: {
        findUnique: jest.fn().mockResolvedValue({
          id: "expired",
          title: "Expired dossier",
          status: InvestigationStatus.ARCHIVED,
          updatedAt: new Date("2020-01-01T00:00:00.000Z")
        })
      }
    } as never, tenant as never, {} as never);

    await expect(
      purgeService.purge(
        { organizationId: "pilot-org", actorId: "owner", role: OrganizationRole.OWNER },
        "expired",
        { confirmation: "PURGE expired", exportAcknowledged: false }
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("purges an expired archived investigation after explicit confirmation", async () => {
    const prisma = {
      investigation: {
        findUnique: jest.fn().mockResolvedValue({
          id: "expired",
          title: "Expired dossier",
          status: InvestigationStatus.ARCHIVED,
          updatedAt: new Date("2020-01-01T00:00:00.000Z")
        }),
        delete: jest.fn().mockResolvedValue({ id: "expired" })
      }
    };
    const audit = { record: jest.fn() };
    const purgeService = new InvestigationsService(prisma as never, tenant as never, audit as never);

    await expect(
      purgeService.purge(
        { organizationId: "pilot-org", actorId: "owner", role: OrganizationRole.OWNER },
        "expired",
        { confirmation: "PURGE expired", exportAcknowledged: true }
      )
    ).resolves.toEqual({ purged: true, investigationId: "expired" });
    expect(audit.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "INVESTIGATION_PURGED" })
    );
    expect(audit.record.mock.calls[0][1]).not.toHaveProperty("investigationId");
  });
});
