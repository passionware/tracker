import { Client } from "@/api/clients/clients.api.ts";
import { RemoteData } from "@passionware/monads";

export interface ClientService {
  useClients: () => RemoteData<Client[]>;
  useClient: (id: number) => RemoteData<Client>;
}

export interface WithClientService {
  clientService: ClientService;
}
