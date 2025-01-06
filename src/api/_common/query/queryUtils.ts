import { Pagination } from "@/api/_common/query/pagination.ts";
import { Sorter } from "@/api/_common/query/sorters/Sorter.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import { maybe, Maybe } from "@passionware/monads";

export interface WithSorter<Field> {
  sort: Nullable<Sorter<Field>>;
}

export type WithPagination = {
  page: Pagination;
};

export type WithSearch = {
  search: string;
};

type FilterBase = Record<string, unknown>;
export type WithFilters<F extends FilterBase> = {
  filters: F;
};

export const withPaginationUtils = <Q extends WithPagination>() => ({
  resetPage: (query: Q): Q => ({
    ...query,
    page: {
      ...query.page,
      page: 0,
    },
  }),
  nextPage: (query: Q): Q => ({
    ...query,
    page: {
      ...query.page,
      page: query.page.page + 1,
    },
  }),
  prevPage: (query: Q): Q => {
    if (query.page.page === 0) {
      throw new Error(
        "Cannot go to previous page when already on the first page",
      );
    }
    return {
      ...query,
      page: {
        ...query.page,
        page: query.page.page - 1,
      },
    };
  },
  setPage: (query: Q, page: Pagination): Q => ({
    ...query,
    page,
  }),
  setPageSize: (query: Q, pageSize: number): Q => ({
    ...query,
    page: {
      page: 0, // reset page to 0 due to new page size
      pageSize,
    },
  }),
});
export const withSorterUtils = <
  Q extends WithSorter<unknown> & WithPagination,
>() => {
  const pagUtils = withPaginationUtils<Q>();
  return {
    setSort: (query: Q, sort: Maybe<Q["sort"]>): Q =>
      pagUtils.resetPage({
        ...query,
        sort,
      }),
    removeSort: (query: Q): Q =>
      pagUtils.resetPage({
        ...query,
        sort: maybe.ofAbsent(),
      }),
  };
};
export const withSearchUtils = <Q extends WithSearch>() => ({
  setSearch: (query: Q, search: string): Q => ({
    ...query,
    search: search.trimStart(),
  }),
  removeSearch: (query: Q): Q => ({
    ...query,
    search: "",
  }),
});

export const withFiltersUtils = <
  Q extends WithFilters<FilterBase> & WithPagination,
>() => {
  const pagUtils = withPaginationUtils<Q>();
  return {
    setFilter: <K extends keyof Q["filters"]>(
      query: Q,
      filterName: K,
      value: Q["filters"][K],
    ): Q =>
      pagUtils.resetPage({
        ...query,
        filters: {
          ...query.filters,
          [filterName]: maybe.of(value), // using maybe.of(value) instead of value to ensure consistent absent value representation
        },
      }),
    removeFilter: (query: Q, filterName: keyof Q["filters"]): Q =>
      pagUtils.resetPage({
        ...query,
        filters: {
          ...query.filters,
          [filterName]: maybe.ofAbsent(),
        },
      }),
  };
};
