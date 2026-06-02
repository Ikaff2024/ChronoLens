import { ConflictException } from "@nestjs/common";
import { EvidenceSource } from "@prisma/client";
import { evidenceHash } from "../src/evidence/evidence-hash";
import { EvidenceService } from "../src/evidence/evidence.service";

describe("EvidenceService", () => {
  const prisma = {
    investigation: { findUnique: jest.fn().mockResolvedValue({ id: "investigation" }) },
    evidence: {
      findFirst: jest.fn().mockResolvedValue({ id: "existing" }),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    }
  };
  const tenant = { ensure: jest.fn(), assertCanWrite: jest.fn() };
  const audit = { record: jest.fn() };
  const service = new EvidenceService(prisma as never, tenant as never, audit as never);

  it("rejects duplicate URLs in the same investigation", async () => {
    await expect(
      service.create(
        { organizationId: "pilot-org", actorId: "tester", role: "OWNER" },
        {
          investigationId: "0b3f8866-6827-4c04-a87e-f4f6c101d495",
          source: EvidenceSource.URL,
          title: "Existing source",
          url: "https://example.org/source",
          capturedAt: new Date()
        }
      )
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("verifies a server-generated evidence hash", async () => {
    const evidence = {
      id: "evidence",
      source: EvidenceSource.URL,
      title: "Source publique",
      url: "https://example.org/source",
      occurredAt: new Date("2026-05-20T10:00:00.000Z"),
      notes: "Note analyste"
    };
    prisma.evidence.findFirst.mockResolvedValueOnce({ ...evidence, contentHash: evidenceHash(evidence) });

    await expect(
      service.verify({ organizationId: "pilot-org", actorId: "tester", role: "OWNER" }, evidence.id)
    ).resolves.toMatchObject({ evidenceId: evidence.id, integrity: "VALID" });
    expect(audit.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "EVIDENCE_INTEGRITY_VERIFIED", details: { integrity: "VALID" } })
    );
  });

  it("detects a mismatch after evidence alteration", async () => {
    prisma.evidence.findFirst.mockResolvedValueOnce({
      id: "evidence-altered",
      investigationId: "investigation",
      source: EvidenceSource.URL,
      title: "Titre modifie",
      url: "https://example.org/source",
      occurredAt: null,
      notes: null,
      contentHash: evidenceHash({
        source: EvidenceSource.URL,
        title: "Titre original",
        url: "https://example.org/source"
      })
    });

    await expect(
      service.verify({ organizationId: "pilot-org", actorId: "tester", role: "OWNER" }, "evidence-altered")
    ).resolves.toMatchObject({ integrity: "MISMATCH" });
  });

  it("identifies historical evidence without a hash", async () => {
    prisma.evidence.findFirst.mockResolvedValueOnce({
      id: "evidence-historical",
      investigationId: "investigation",
      source: EvidenceSource.URL,
      title: "Preuve historique",
      url: null,
      occurredAt: null,
      notes: null,
      contentHash: null
    });

    await expect(
      service.verify({ organizationId: "pilot-org", actorId: "tester", role: "OWNER" }, "evidence-historical")
    ).resolves.toMatchObject({ integrity: "UNHASHED" });
  });

  it("backfills only unhashed evidence", async () => {
    prisma.evidence.findMany.mockResolvedValueOnce([
      {
        id: "historical",
        investigationId: "investigation",
        source: EvidenceSource.URL,
        title: "Preuve historique",
        url: "https://example.org/historical",
        occurredAt: null,
        notes: null
      }
    ]);

    await expect(
      service.backfill({ organizationId: "pilot-org", actorId: "tester", role: "OWNER" }, "investigation")
    ).resolves.toEqual({ backfilled: 1 });
    expect(prisma.evidence.update).toHaveBeenCalledWith({
      where: { id: "historical" },
      data: { contentHash: expect.any(String) }
    });
  });

  it("keeps backfill idempotent when no evidence is missing a hash", async () => {
    prisma.evidence.findMany.mockResolvedValueOnce([]);

    await expect(
      service.backfill({ organizationId: "pilot-org", actorId: "tester", role: "OWNER" })
    ).resolves.toEqual({ backfilled: 0 });
  });
});
