import { Client, ClientQuery } from "@/api/clients/clients.api.ts";
import { Maybe, RemoteData } from "@passionware/monads";

export interface ClientService {
  useClients: (query: ClientQuery) => RemoteData<Client[]>;
  useClient: (id: Maybe<number>) => RemoteData<Client>;
}

export interface WithClientService {
  clientService: ClientService;
}
