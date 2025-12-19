import { ArgsScopedAccessor } from "@passionware/platform-storybook";
import { reportQueryUtils } from "@/api/reports/reports.api.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { QueryParamsService } from "./QueryParamsService";

export interface QueryParamsServiceConfig<
  QueryParamsConfig extends Record<string, object>,
> {
  resolvers: {
    [K in keyof QueryParamsConfig]: ArgsScopedAccessor<QueryParamsConfig[K]>;
  };
}

export const defaultQueryParamsMockConfig = {
  resolvers: {
    projects: {
      get: () => ({
        search: "",
        page: { page: 0, pageSize: 25 },
        sort: null,
        filters: {
          clientId: null,
          workspaceId: null,
          status: null,
          createdAt: null,
        },
      }),
      use: () => ({
        search: "",
        page: { page: 0, pageSize: 25 },
        sort: null,
        filters: {
          clientId: null,
          workspaceId: null,
          status: null,
          createdAt: null,
        },
      }),
    },
    users: {
      get: () => ({
        search: "",
        page: { page: 0, pageSize: 25 },
        filters: { role: null, status: null },
      }),
      use: () => ({
        search: "",
        page: { page: 0, pageSize: 25 },
        filters: { role: null, status: null },
      }),
    },
    reports: {
      get: () =>
        reportQueryUtils.ofDefault(idSpecUtils.ofAll(), idSpecUtils.ofAll()),
      use: () =>
        reportQueryUtils.ofDefault(idSpecUtils.ofAll(), idSpecUtils.ofAll()),
    },
  },
};

export function createMockQueryParamsService<
  QueryParamsConfig extends Record<string, object>,
>(
  config: QueryParamsServiceConfig<QueryParamsConfig>,
): QueryParamsService<QueryParamsConfig> {
  return {
    forEntity: (entity) => ({
      getQueryParams: () => config.resolvers[entity].get(),
      useQueryParams: () => config.resolvers[entity].use(),
      setQueryParams: (params) => {
        // Mock implementation - in real storybook, this would update args
        console.log("setQueryParams called with:", params);
      },
      updateQueryParams: (updater) => {
        // Mock implementation - in real storybook, this would update args
        console.log("updateQueryParams called");
      },
    }),
  };
}
