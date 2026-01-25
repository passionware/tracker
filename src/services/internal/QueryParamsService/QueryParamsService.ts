/**
 * Primitive interface to read query params from URL for a specific entity
 */
export type ScopedQueryParamsService<QueryParams> = {
  useQueryParams: () => QueryParams;
  getQueryParams: () => QueryParams;
  setQueryParams: (params: QueryParams) => void;
  updateQueryParams: (updater: (current: QueryParams) => QueryParams) => void;
};

export interface createQueryParamsServiceConfig<
  T extends Record<string, object>,
> {
  parseQueryParams: {
    [K in keyof T]: (params: Record<string, unknown>) => T[K];
  };
}

export interface QueryParamsService<
  QueryParamsConfig extends Record<string, object>,
> {
  forEntity<T extends keyof QueryParamsConfig & string>(
    entity: T,
  ): ScopedQueryParamsService<QueryParamsConfig[T]>;
}

export interface WithQueryParamsService<T extends Record<string, object>> {
  queryParamsService: QueryParamsService<T>;
}
