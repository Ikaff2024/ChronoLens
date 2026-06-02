import { HealthController } from "../src/health.controller";

describe("HealthController", () => {
  it("returns the API and database status", async () => {
    const controller = new HealthController({ $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]) } as never);
    await expect(controller.getHealth()).resolves.toMatchObject({
      status: "ok",
      service: "chronolens-api",
      checks: { database: "ok" }
    });
  });
});
