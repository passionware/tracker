import {
  BooleanFilter,
  booleanFilter,
  booleanFilterSchema,
} from "@/api/_common/query/filters/BooleanFilter.ts";
import {
  enumFilterSchema,
  EnumFilter,
} from "@/api/_common/query/filters/EnumFilter.ts";
import {
  paginationSchema,
  paginationUtils,
} from "@/api/_common/query/pagination.ts";
import {
  withBuilderUtils,
  WithFilters,
  withFiltersUtils,
  WithPagination,
  WithSearch,
  withSearchUtils,
  WithSorter,
  withSorterUtils,
} from "@/api/_common/query/queryUtils.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import { Maybe } from "@passionware/monads";
import { z } from "zod";

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  avatarUrl: Maybe<string>;
  /** When true, omitted from switchers and pickers (listing only). */
  hidden: boolean;
}

export type WorkspaceListSortField = "name" | "id" | "slug";

export type WorkspaceQuery = WithSearch &
  WithPagination &
  WithSorter<WorkspaceListSortField> &
  WithFilters<{
    id: EnumFilter<Nullable<Workspace["id"]>>;
    /** When set, only workspaces whose `hidden` flag matches the filter value. */
    hidden: Nullable<BooleanFilter>;
  }>;

export const workspaceQueryUtils = withBuilderUtils({
  ...withSearchUtils<WorkspaceQuery>(),
  ...withFiltersUtils<WorkspaceQuery>(),
  ...withSorterUtils<WorkspaceQuery>(),
  ofEmpty: (): WorkspaceQuery => ({
    search: "",
    sort: { field: "name", order: "asc" },
    filters: {
      id: null,
      hidden: null,
    },
    page: paginationUtils.ofDefault(),
  }),
  /** Switchers and pickers: non-hidden workspaces only. */
  ofDefault: (): WorkspaceQuery =>
    workspaceQueryUtils.setFilter(
      workspaceQueryUtils.ofEmpty(),
      "hidden",
      booleanFilter.createDefault(false),
    ),
  ensureDefault: (query: WorkspaceQuery): WorkspaceQuery => {
    const empty = workspaceQueryUtils.ofEmpty();
    return {
      search: query.search ?? "",
      sort: query.sort ?? empty.sort,
      page: {
        page: query.page?.page ?? empty.page.page,
        pageSize: query.page?.pageSize ?? empty.page.pageSize,
      },
      filters: {
        id: query.filters?.id ?? empty.filters.id,
        hidden: query.filters?.hidden ?? empty.filters.hidden,
      },
    };
  },
})
  .setInitialQueryFactory((x) => x.ofEmpty);

const strToNull = (str: unknown) => (str === "" ? null : str);

export const workspaceQuerySchema = z
  .object({
    search: z.preprocess((value) => value || "", z.string()).default(""),
    filters: z.object({
      id: z
        .preprocess(
          strToNull,
          enumFilterSchema(
            z.preprocess(strToNull, z.coerce.number().nullable()),
          ).nullable(),
        )
        .default(null),
      hidden: z
        .preprocess(strToNull, booleanFilterSchema.nullable())
        .default(null),
    }),
    page: paginationSchema,
    sort: z
      .preprocess(
        strToNull,
        z
          .object({
            field: z.enum(["name", "id", "slug"]),
            order: z.enum(["asc", "desc"]),
          })
          .nullable(),
      )
      .default(null),
  })
  .catch((e) => {
    console.error(e);
    return workspaceQueryUtils.ofEmpty();
  });

export interface WorkspaceApi {
  getWorkspaces: (query: WorkspaceQuery) => Promise<Workspace[]>;
  getWorkspace: (id: Workspace["id"]) => Promise<Workspace>;
}
