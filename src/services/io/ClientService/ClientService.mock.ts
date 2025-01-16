import { ClientService } from "@/services/io/ClientService/ClientService.ts";
import { rd } from "@passionware/monads";

export function createClientService(): ClientService {
  return {
    useClients: () =>
      rd.of([
        {
          id: 1,
          name: "Client 1",
          fullName: "Client 1",
          avatarUrl: null,
        },
      ]),
    useClient: () =>
      rd.of({
        id: 1,
        name: "Client 1",
        fullName: "Client 1",
        avatarUrl: null,
      }),
  };
}
