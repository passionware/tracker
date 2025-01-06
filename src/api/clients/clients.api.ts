import { WithSearch, withSearchUtils } from "@/api/_common/query/queryUtils.ts";
import { Maybe } from "@passionware/monads";

export interface Client {
  id: number;
  name: string;
  avatarUrl: Maybe<string>;
}

export type ClientQuery = WithSearch;

export const clientQueryUtils = {
  ...withSearchUtils<ClientQuery>(),
  ofEmpty: (): ClientQuery => ({
    search: "",
  }),
};

export interface ClientsApi {
  getClients: (query: ClientQuery) => Promise<Client[]>;
  getClient: (id: number) => Promise<Client>;
}
