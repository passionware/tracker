import { z } from "zod";

export type Pagination = {
  pageSize: number;
  // 0-based
  page: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  count: number;
};

export const paginationUtils = {
  cutPage: <T>(items: T[], pagination: Pagination): T[] => {
    const start = pagination.page * pagination.pageSize;
    return items.slice(start, start + pagination.pageSize);
  },
  cutResponse: <T>(
    allArray: T[],
    pagination: Pagination,
  ): PaginatedResponse<T> => ({
    items: paginationUtils.cutPage(allArray, pagination),
    count: allArray.length,
  }),
  ofDefault: (): Pagination => ({
    pageSize: 25,
    page: 0,
  }),
  toRange: (pagination: Pagination): { from: number; to: number } => ({
    from: pagination.page * pagination.pageSize,
    to: (pagination.page + 1) * pagination.pageSize - 1,
  }),
  getTotalPages: (pagination: Pagination, totalItems: number): number =>
    Math.max(1, Math.ceil(totalItems / pagination.pageSize)),
  nextPage: (pagination: Pagination): Pagination => ({
    ...pagination,
    page: pagination.page + 1,
  }),
  prevPage: (pagination: Pagination): Pagination => {
    if (pagination.page === 0) {
      throw new Error(
        "Cannot go to previous page when already on the first page",
      );
    }
    return {
      ...pagination,
      page: pagination.page - 1,
    };
  },
};

export const paginationSchema = z
  .object({
    pageSize: z.coerce.number(),
    page: z.coerce.number(),
  })
  .catch(paginationUtils.ofDefault);
