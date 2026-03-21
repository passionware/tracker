import { Client, ClientQuery } from "@/api/clients/clients.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { Maybe, RemoteData } from "@passionware/monads";

export interface ClientService {
  useClients: (query: ClientQuery) => RemoteData<Client[]>;
  useClient: (id: Maybe<number>) => RemoteData<Client>;
  useClientLinkedWorkspaces: (
    clientId: Maybe<Client["id"]>,
  ) => RemoteData<Workspace[]>;
}

export interface WithClientService {
  clientService: ClientService;
}
