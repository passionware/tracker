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
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { Maybe } from "@passionware/monads";
import { z } from "zod";

export interface Client {
  id: number;
  name: string;
  avatarUrl: Maybe<string>;
  /** Optional expected bank transfer sender label for payment matching. */
  senderName: Maybe<string>;
  /** When true, omitted from client switchers and pickers (listing only). */
  hidden: boolean;
}

export type ClientListSortField = "name" | "id" | "senderName";

export type ClientQuery = WithSearch &
  WithPagination &
  WithSorter<ClientListSortField> &
  WithFilters<{
    id: EnumFilter<Nullable<Client["id"]>>;
    /** When set, only clients whose `hidden` flag matches the filter value. */
    hidden: Nullable<BooleanFilter>;
  }>;

export const clientQueryUtils = withBuilderUtils({
  ...withSearchUtils<ClientQuery>(),
  ...withFiltersUtils<ClientQuery>(),
  ...withSorterUtils<ClientQuery>(),
  ofEmpty: (): ClientQuery => ({
    search: "",
    sort: { field: "name", order: "asc" },
    filters: {
      id: null,
      hidden: null,
    },
    page: paginationUtils.ofDefault(),
  }),
  /** Switchers and pickers: non-hidden clients only. */
  ofDefault: (): ClientQuery =>
    clientQueryUtils.setFilter(
      clientQueryUtils.ofEmpty(),
      "hidden",
      booleanFilter.createDefault(false),
    ),
  ensureDefault: (query: ClientQuery): ClientQuery => {
    const empty = clientQueryUtils.ofEmpty();
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

export const clientQuerySchema = z
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
            field: z.enum(["name", "id", "senderName"]),
            order: z.enum(["asc", "desc"]),
          })
          .nullable(),
      )
      .default(null),
  })
  .catch((e) => {
    console.error(e);
    return clientQueryUtils.ofEmpty();
  });

export interface ClientsApi {
  getClients: (query: ClientQuery) => Promise<Client[]>;
  getClient: (id: number) => Promise<Client>;
  getLinkedWorkspacesForClient: (clientId: Client["id"]) => Promise<Workspace[]>;
  getLinkedClientsForWorkspace: (
    workspaceId: Workspace["id"],
  ) => Promise<Client[]>;
}
