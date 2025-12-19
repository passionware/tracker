import { Maybe } from "@passionware/monads";
import {
  EnumFilter,
  enumFilter,
  enumFilterSchema,
} from "@/api/_common/query/filters/EnumFilter";
import {
  PaginatedResponse,
  paginationSchema,
  paginationUtils,
} from "@/api/_common/query/pagination";
import {
  withBuilderUtils,
  WithFilters,
  withFiltersUtils,
  WithPagination,
  withPaginationUtils,
  WithSearch,
  withSearchUtils,
  WithSorter,
  withSorterUtils,
} from "@/api/_common/query/queryUtils";
import { z } from "zod";

export type { PaginatedResponse } from "@/api/_common/query/pagination";

/**
 * User information
 */
export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "invited" | "archived";
  avatarUrl: Maybe<string>;
  lastLoggedIn?: Date;
};

export type UserStatus = User["status"];

/**
 * User search query with support for sorting by:
 * - name: User name
 * - role: User role
 * - status: User status
 */
export type UserSearchQuery = WithSearch &
  WithPagination &
  WithSorter<"name" | "role" | "status" | "lastLoggedIn"> &
  WithFilters<{
    workspaceId: EnumFilter<string>;
    role: EnumFilter<string>;
    status: EnumFilter<UserStatus>;
  }>;

export type UserQuery = UserSearchQuery;

export const userQueryUtils = withBuilderUtils({
  ...withSearchUtils<UserSearchQuery>(),
  ...withFiltersUtils<UserSearchQuery>(),
  ...withPaginationUtils<UserSearchQuery>(),
  ...withSorterUtils<UserSearchQuery>(),
  ofEmptySearchQuery: (workspaceId: string): UserSearchQuery => ({
    search: "",
    page: paginationUtils.ofDefault(),
    sort: null,
    filters: {
      workspaceId: enumFilter.ofOneOf([workspaceId]),
      role: null,
      status: null,
    },
  }),
  /**
   * Checks if a user matches the given query criteria
   */
  matches: (user: User, query: UserSearchQuery): boolean => {
    // Check search query (simple string contains check)
    if (
      query.search &&
      !user.name.toLowerCase().includes(query.search.toLowerCase()) &&
      !user.email.toLowerCase().includes(query.search.toLowerCase())
    ) {
      return false;
    }

    // Check workspaceId filter
    // Note: In a real app, users would have a workspaceId property
    // For mock data, we skip this check (all mock users belong to all workspaces)
    // if (
    //   query.filters?.workspaceId &&
    //   !enumFilter.matches(query.filters.workspaceId, user.workspaceId)
    // ) {
    //   return false;
    // }

    // Check role filter
    if (
      query.filters?.role &&
      !enumFilter.matches(query.filters.role, user.role)
    ) {
      return false;
    }

    // Check status filter
    if (
      query.filters?.status &&
      !enumFilter.matches(query.filters.status, user.status)
    ) {
      return false;
    }

    return true;
  },
}).setInitialQueryFactory((x) => x.ofEmptySearchQuery);

const strToNull = (str: unknown) => (str === "" ? null : str);

export const userSearchQuerySchema = z
  .object({
    search: z.preprocess((value) => value || "", z.string()).default(""),
    filters: z.object({
      workspaceId: z
        .preprocess(strToNull, enumFilterSchema(z.string()).nullable())
        .default(null),
      role: z
        .preprocess(strToNull, enumFilterSchema(z.string()).nullable())
        .default(null),
      status: z
        .preprocess(
          strToNull,
          enumFilterSchema(
            z.enum(["active", "invited", "archived"]),
          ).nullable(),
        )
        .default(null),
    }),
    page: paginationSchema,
    sort: z
      .preprocess(
        strToNull,
        z
          .object({
            field: z.enum(["name", "role", "status", "lastLoggedIn"]),
            order: z.enum(["asc", "desc"]),
          })
          .nullable(),
      )
      .default(null),
  })
  .catch(() => userQueryUtils.ofEmptySearchQuery(""));

export const userQuerySchema = userSearchQuerySchema;

/**
 * Invite user payload
 */
export type InviteUserPayload = {
  email: string;
  role: string;
  workspaceId: string;
};

/**
 * Update user payload
 */
export type UpdateUserPayload = {
  role: string;
};

export interface UserApi {
  getUsers(query: UserQuery): Promise<PaginatedResponse<User>>;
  getUser(id: User["id"]): Promise<User>;
  inviteUser(payload: InviteUserPayload): Promise<User>;
  updateUser(id: User["id"], payload: UpdateUserPayload): Promise<User>;
  resendInvite(id: User["id"]): Promise<void>;
  archiveUser(id: User["id"]): Promise<void>;
  deleteUser(id: User["id"]): Promise<void>;
}
