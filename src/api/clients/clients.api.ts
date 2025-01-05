import { Maybe } from "@passionware/monads";

export interface Client {
  id: number;
  name: string;
  avatarUrl: Maybe<string>;
}

export interface ClientsApi {
  getClients: () => Promise<Client[]>;
  getClient: (id: number) => Promise<Client>;
}
