import { Pagination } from "@/api/_common/query/pagination.ts";
import { Sorter } from "@/api/_common/query/sorters/Sorter.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import { maybe, Maybe } from "@passionware/monads";
import { partial, partialRight } from "lodash";

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
  filters: { [K in keyof F]: Nullable<F[K]> };
};
export type QueryFilter<Q extends WithFilters<FilterBase>, K extends keyof Q["filters"]> = Q["filters"][K];

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
  Q extends { sort: Maybe<SpecificSorter> } & WithPagination,
  SpecificSorter extends Sorter<unknown> = Sorter<unknown>,
>() => {
  const pagUtils = withPaginationUtils<Q>();
  const api = {
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
    withSort: (sort: Maybe<Q["sort"]>) => partialRight(api.setSort, sort),
  };
  return api;
};
export const withSearchUtils = <Q extends WithSearch>() => {
  const api = {
    setSearch: (query: Q, search: string): Q => ({
      ...query,
      search: search.trimStart(),
    }),
    removeSearch: (query: Q): Q => ({
      ...query,
      search: "",
    }),
    withSearch: (search: string) => partialRight(api.setSearch, search),
  };
  return api;
};

export const withFiltersUtils = <
  Q extends WithFilters<FilterBase> & WithPagination,
>() => {
  const pagUtils = withPaginationUtils<Q>();
  const api = {
    setFilter: <K extends keyof Q["filters"]>(
      query: Q,
      filterName: K,
      value: Maybe<Q["filters"][K]>,
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
    withFilter: <K extends keyof Q["filters"]>(
      filterName: K,
      value: Maybe<Q["filters"][K]>,
    ) => partialRight(api.setFilter, filterName, value),
    withoutFilter: (filterName: keyof Q["filters"]) =>
      partialRight(api.removeFilter, filterName),
  };
  return api;
};

export const withBuilderUtils = <Api>(api: Api) => {
  return {
    setInitialQueryFactory: <Input extends unknown[], Q>(
      factoryFn: (api: Api) => (...args: Input) => Q,
    ) => {
      const rawBuild = (
        startQuery: Q,
        getMappers: (
          api: Api & { unchanged: () => (query: Q) => Q },
        ) => Array<(input: Q) => Q>,
      ): Q => {
        const api2 = { ...api, unchanged: () => (query: Q) => query };
        return getMappers(api2).reduce(
          (query, mapper) => mapper(query),
          startQuery,
        );
      };

      const initialQueryFactory = factoryFn(api);

      return {
        ...api,
        getBuilder: (...args: Input) => {
          // Explicitly infer the types for slicing

          const initialQuery = initialQueryFactory(...args);
          return {
            build: partial(rawBuild, initialQuery),
          };
        },
        transform: (initialQuery: Q) => ({
          build: partial(rawBuild, initialQuery),
        }),
      };
    },
  };
};
