import { BadRequestException } from "@nestjs/common";
import { pageArgs, pageResult, pagination } from "../src/common/pagination";

describe("pagination", () => {
  it("keeps legacy responses when pagination is omitted", () => {
    expect(pagination()).toBeUndefined();
    expect(pageResult(["item"], 1)).toEqual(["item"]);
  });

  it("parses bounded pages and creates Prisma offsets", () => {
    const value = pagination("3", "25");
    expect(value).toEqual({ page: 3, pageSize: 25 });
    expect(pageArgs(value)).toEqual({ skip: 50, take: 25 });
    expect(pageResult(["item"], 51, value)).toEqual({ items: ["item"], total: 51, page: 3, pageSize: 25 });
  });

  it("rejects oversized pages", () => {
    expect(() => pagination("1", "101")).toThrow(BadRequestException);
  });
});
