import { EnumFilter } from "@/api/_common/query/filters/EnumFilter.ts";
import { paginationUtils } from "@/api/_common/query/pagination.ts";
import {
  withBuilderUtils,
  WithFilters,
  withFiltersUtils,
  WithPagination,
  WithSearch,
  withSearchUtils,
} from "@/api/_common/query/queryUtils.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import { Maybe } from "@passionware/monads";

export interface Client {
  id: number;
  name: string;
  avatarUrl: Maybe<string>;
}

export type ClientQuery = WithSearch &
  WithPagination &
  WithFilters<{
    id: EnumFilter<Nullable<Client["id"]>>;
  }>;

export const clientQueryUtils = withBuilderUtils({
  ...withSearchUtils<ClientQuery>(),
  ...withFiltersUtils<ClientQuery>(),
  ofEmpty: (): ClientQuery => ({
    search: "",
    filters: {
      id: null,
    },
    page: paginationUtils.ofDefault(),
  }),
}).setInitialQueryFactory((x) => x.ofEmpty);

export interface ClientsApi {
  getClients: (query: ClientQuery) => Promise<Client[]>;
  getClient: (id: number) => Promise<Client>;
}
