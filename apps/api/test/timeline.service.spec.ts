import { TimelineService } from "../src/timeline/timeline.service";

describe("TimelineService", () => {
  const investigation = { id: "investigation" };
  const entities = [
    {
      id: "entity-1",
      type: "PERSON",
      name: "Amina Diallo",
      description: null,
      firstSeen: new Date("2026-01-03T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z")
    },
    {
      id: "entity-2",
      type: "ORGANIZATION",
      name: "Northstar Labs",
      description: "Observed supplier",
      firstSeen: new Date("2026-01-02T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z")
    }
  ];
  const relationships = [
    {
      id: "relationship-1",
      type: "PARTNER",
      description: null,
      validFrom: new Date("2026-01-04T00:00:00.000Z"),
      sourceEntity: { name: "Amina Diallo" },
      targetEntity: { name: "Northstar Labs" }
    }
  ];
  const evidence = [
    {
      id: "evidence-1",
      title: "Public registry filing",
      notes: "Registry source",
      occurredAt: new Date("2026-01-05T00:00:00.000Z"),
      capturedAt: new Date("2026-01-06T00:00:00.000Z")
    }
  ];

  const createService = () => {
    const prisma = {
      investigation: { findUnique: jest.fn().mockResolvedValue(investigation) },
      entity: {
        findMany: jest.fn().mockResolvedValue(entities),
        count: jest.fn().mockResolvedValue(entities.length)
      },
      relationship: {
        findMany: jest.fn().mockResolvedValue(relationships),
        count: jest.fn().mockResolvedValue(relationships.length)
      },
      evidence: {
        findMany: jest.fn().mockResolvedValue(evidence),
        count: jest.fn().mockResolvedValue(evidence.length)
      }
    };
    const tenant = { ensure: jest.fn() };
    return { prisma, service: new TimelineService(prisma as never, tenant as never) };
  };

  const context = { organizationId: "pilot-org", actorId: "tester", role: "OWNER" as const };

  it("keeps the legacy complete timeline when pagination is omitted", async () => {
    const { prisma, service } = createService();

    await expect(service.get(context, "investigation")).resolves.toHaveLength(4);
    expect(prisma.entity.findMany).toHaveBeenCalledWith(expect.not.objectContaining({ take: expect.any(Number) }));
    expect(prisma.entity.count).not.toHaveBeenCalled();
  });

  it("returns a paginated timeline with a total count", async () => {
    const { prisma, service } = createService();

    await expect(service.get(context, "investigation", { page: 1, pageSize: 2 })).resolves.toMatchObject({
      items: [
        expect.objectContaining({ id: "evidence-1" }),
        expect.objectContaining({ id: "relationship-1" })
      ],
      total: 4,
      page: 1,
      pageSize: 2
    });
    expect(prisma.entity.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 2 }));
    expect(prisma.relationship.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 2 }));
    expect(prisma.evidence.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 2 }));
  });
});
