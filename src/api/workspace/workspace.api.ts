import { EnumFilter } from "@/api/_common/query/filters/EnumFilter.ts";
import { paginationUtils } from "@/api/_common/query/pagination.ts";
import {
  withBuilderUtils,
  WithFilters,
  withFiltersUtils,
  WithPagination,
  withPaginationUtils,
  WithSearch,
  withSearchUtils,
} from "@/api/_common/query/queryUtils.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import { Maybe } from "@passionware/monads";

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  avatarUrl: Maybe<string>;
}

export type WorkspaceQuery = WithSearch &
  WithPagination &
  WithFilters<{
    id: EnumFilter<Nullable<Workspace["id"]>>;
  }>;
export const workspaceQueryUtils = withBuilderUtils({
  ...withSearchUtils<WorkspaceQuery>(),
  ...withPaginationUtils<WorkspaceQuery>(),
  ...withFiltersUtils<WorkspaceQuery>(),
  ofEmpty: (): WorkspaceQuery => ({
    search: "",
    page: paginationUtils.ofDefault(),
    filters: {
      id: null,
    },
  }),
}).setInitialQueryFactory((x) => x.ofEmpty);

export interface WorkspaceApi {
  getWorkspaces: (query: WorkspaceQuery) => Promise<Workspace[]>;
  getWorkspace: (id: Workspace["id"]) => Promise<Workspace>;
}
