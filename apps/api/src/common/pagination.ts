import { BadRequestException } from "@nestjs/common";

export type Pagination = { page: number; pageSize: number };

export function pagination(page?: string, pageSize?: string): Pagination | undefined {
  if (!page && !pageSize) return undefined;
  const parsedPage = Number(page ?? "1");
  const parsedPageSize = Number(pageSize ?? "25");
  if (!Number.isInteger(parsedPage) || parsedPage < 1) throw new BadRequestException("page must be a positive integer");
  if (!Number.isInteger(parsedPageSize) || parsedPageSize < 1 || parsedPageSize > 100) {
    throw new BadRequestException("pageSize must be an integer between 1 and 100");
  }
  return { page: parsedPage, pageSize: parsedPageSize };
}

export function pageArgs(value?: Pagination): { skip?: number; take?: number } {
  return value ? { skip: (value.page - 1) * value.pageSize, take: value.pageSize } : {};
}

export function pageResult<T>(items: T[], total: number, value?: Pagination) {
  return value ? { items, total, page: value.page, pageSize: value.pageSize } : items;
}
