import { BadRequestException } from "@nestjs/common";
import { EntitiesService } from "../src/entities/entities.service";

describe("EntitiesService CSV import", () => {
  const prisma = {
    investigation: { findUnique: jest.fn().mockResolvedValue({ id: "0b3f8866-6827-4c04-a87e-f4f6c101d495" }) },
    entity: {
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
      findMany: jest.fn().mockResolvedValue([])
    }
  };
  const tenant = { ensure: jest.fn(), assertCanWrite: jest.fn() };
  const audit = { record: jest.fn() };
  const service = new EntitiesService(prisma as never, tenant as never, audit as never);
  const context = { organizationId: "pilot-org", actorId: "tester", role: "OWNER" as const };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("imports validated rows and records an audit entry", async () => {
    const result = await service.importCsv(context, {
      investigationId: "0b3f8866-6827-4c04-a87e-f4f6c101d495",
      csv: "type,name,confidence\nORGANIZATION,Northstar Labs,0.86\nPERSON,Amadou Kone,0.78"
    });

    expect(result).toEqual({ imported: 2, skipped: 0 });
    expect(prisma.entity.createMany).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledTimes(1);
  });

  it("skips duplicates already present in the investigation", async () => {
    prisma.entity.findMany.mockResolvedValueOnce([{ type: "ORGANIZATION", name: "Northstar Labs" }]);
    prisma.entity.createMany.mockResolvedValueOnce({ count: 1 });

    const result = await service.importCsv(context, {
      investigationId: "0b3f8866-6827-4c04-a87e-f4f6c101d495",
      csv: "type,name\nORGANIZATION,Northstar Labs\nPERSON,Amadou Kone"
    });

    expect(result).toEqual({ imported: 1, skipped: 1 });
  });

  it("rejects unknown entity types", async () => {
    await expect(
      service.importCsv(context, {
        investigationId: "0b3f8866-6827-4c04-a87e-f4f6c101d495",
        csv: "type,name\nUNKNOWN,Northstar Labs"
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
