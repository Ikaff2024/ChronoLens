import { BadRequestException } from "@nestjs/common";
import { RelationshipType } from "@prisma/client";
import { RelationshipsService } from "../src/relationships/relationships.service";

describe("RelationshipsService", () => {
  const prisma = { relationship: { create: jest.fn() } };
  const tenant = { ensure: jest.fn(), assertCanWrite: jest.fn() };
  const service = new RelationshipsService(prisma as never, tenant as never, {} as never);

  it("rejects loops", async () => {
    await expect(
      service.create({ organizationId: "pilot-org", actorId: "tester", role: "OWNER" }, {
        investigationId: "0b3f8866-6827-4c04-a87e-f4f6c101d495",
        sourceEntityId: "d9e87396-78e1-4665-bf15-05392a8d74f5",
        targetEntityId: "d9e87396-78e1-4665-bf15-05392a8d74f5",
        type: RelationshipType.ASSOCIATED,
        validFrom: new Date()
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects inverted date ranges", async () => {
    await expect(
      service.create({ organizationId: "pilot-org", actorId: "tester", role: "OWNER" }, {
        investigationId: "0b3f8866-6827-4c04-a87e-f4f6c101d495",
        sourceEntityId: "d9e87396-78e1-4665-bf15-05392a8d74f5",
        targetEntityId: "14a73748-96c5-40ac-9b00-bbfdb184e58e",
        type: RelationshipType.ASSOCIATED,
        validFrom: new Date("2026-02-01"),
        validTo: new Date("2026-01-01")
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
