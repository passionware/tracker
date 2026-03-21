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
}

export type ClientListSortField = "name" | "id" | "senderName";

export type ClientQuery = WithSearch &
  WithPagination &
  WithSorter<ClientListSortField> &
  WithFilters<{
    id: EnumFilter<Nullable<Client["id"]>>;
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
    },
    page: paginationUtils.ofDefault(),
  }),
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
}
