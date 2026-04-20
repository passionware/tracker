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
  WithSorter,
} from "@/api/_common/query/queryUtils.ts";
import { Project } from "@/api/project/project.api.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";

export interface ContractorBase {
  id: number;
  name: string;
  fullName: string;
  createdAt: Date;
  /**
   * Supabase auth user that "is" this contractor. `null` for rows with no
   * login (sub-contractors, placeholders). Populated via the admin mapping
   * UI (see `set_contractor_user` RPC). The partial UNIQUE index on
   * `contractor.user_id` guarantees at most one contractor per auth user.
   */
  authUserId: string | null;
}
export interface Contractor extends ContractorBase {
  projectIds: Project["id"][];
}

export type ContractorQuery = WithSearch &
  WithSorter<"fullName" | "createdAt"> &
  WithFilters<{
    id: EnumFilter<number>;
    projectId: EnumFilter<Nullable<Project["id"]>>;
  }> &
  WithPagination;

export const contractorQueryUtils = withBuilderUtils({
  ...withSearchUtils<ContractorQuery>(),
  ...withFiltersUtils<ContractorQuery>(),
  ...withPaginationUtils<ContractorQuery>(),
  ofEmpty: (): ContractorQuery => ({
    search: "",
    sort: { field: "fullName", order: "asc" },
    page: paginationUtils.ofDefault(),
    filters: { id: null, projectId: null },
  }),
}).setInitialQueryFactory((x) => x.ofEmpty);

/**
 * One row in the admin-only user directory (used by the contractor ↔
 * auth.user mapping UI). Served by `list_auth_user_directory()` RPC so
 * the frontend never needs `service_role` or direct `auth.users` reads.
 */
export interface AuthUserDirectoryEntry {
  id: string;
  email: string | null;
}

export interface ContractorApi {
  getContractors: (query: ContractorQuery) => Promise<Contractor[]>;
  getContractor: (id: Contractor["id"]) => Promise<Contractor>;
  /**
   * Admin-only: link (or unlink, with `authUserId = null`) a contractor
   * row to a Supabase auth user. Implemented as a `SECURITY DEFINER` RPC
   * that checks the caller has a `super_admin` grant in `role`.
   */
  setContractorAuthUser: (args: {
    contractorId: Contractor["id"];
    authUserId: string | null;
  }) => Promise<void>;
  /** Admin-only list of auth users (id + email) for the picker. */
  listAuthUserDirectory: () => Promise<AuthUserDirectoryEntry[]>;
}
