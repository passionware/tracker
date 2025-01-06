import { paginationUtils } from "@/api/_common/query/pagination.ts";
import {
  WithPagination,
  withPaginationUtils,
  WithSearch,
  withSearchUtils,
} from "@/api/_common/query/queryUtils.ts";
import { Maybe } from "@passionware/monads";

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  avatarUrl: Maybe<string>;
}

export type WorkspaceQuery = WithSearch & WithPagination;
export const workspaceQueryUtils = {
  ...withSearchUtils<WorkspaceQuery>(),
  ...withPaginationUtils<WorkspaceQuery>(),
  ofEmpty: (): WorkspaceQuery => ({
    search: "",
    page: paginationUtils.ofDefault(),
  }),
};

export interface WorkspaceApi {
  getWorkspaces: (query: WorkspaceQuery) => Promise<Workspace[]>;
  getWorkspace: (id: Workspace["id"]) => Promise<Workspace>;
}
