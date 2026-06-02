import { RelationshipType } from "@prisma/client";
import { AlertsService } from "../src/alerts/alerts.service";

describe("AlertsService", () => {
  const context = { organizationId: "pilot-org", actorId: "tester", role: "OWNER" as const };
  const tenant = { ensure: jest.fn() };

  it("explains a recent partnership and activity spike", async () => {
    const prisma = {
      investigation: {
        findUnique: jest.fn().mockResolvedValue({
          relationships: [{ id: "rel-1", type: RelationshipType.PARTNER, validFrom: new Date() }],
          evidence: [{ id: "evidence-1" }]
        })
      }
    };
    const timeline = {
      get: jest.fn().mockResolvedValue([
        { id: "1", timestamp: new Date() },
        { id: "2", timestamp: new Date() },
        { id: "3", timestamp: new Date() }
      ])
    };
    const service = new AlertsService(prisma as never, tenant as never, timeline as never);

    const alerts = await service.list(context, "investigation");

    expect(alerts.map((alert) => alert.rule)).toEqual(["RECENT_PARTNERSHIP", "RECENT_ACTIVITY_SPIKE"]);
  });

  it("flags relationships with no registered evidence", async () => {
    const prisma = {
      investigation: {
        findUnique: jest.fn().mockResolvedValue({
          relationships: [{ id: "rel-1", type: RelationshipType.ASSOCIATED, validFrom: new Date("2024-01-01") }],
          evidence: []
        })
      }
    };
    const timeline = { get: jest.fn().mockResolvedValue([]) };
    const service = new AlertsService(prisma as never, tenant as never, timeline as never);

    const alerts = await service.list(context, "investigation");

    expect(alerts[0]).toMatchObject({ rule: "RELATIONSHIP_WITHOUT_EVIDENCE", severity: "HIGH" });
  });
});
