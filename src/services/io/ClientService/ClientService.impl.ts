import { ClientsApi } from "@/api/clients/clients.api.ts";
import { MessageService } from "@/services/internal/MessageService/MessageService.ts";
import { ensureIdleQuery } from "@/services/io/_commont/ensureIdleQuery.ts";
import { ClientService } from "@/services/io/ClientService/ClientService.ts";
import { maybe } from "@passionware/monads";
import { QueryClient, useQuery } from "@tanstack/react-query";

export function createClientService(
  api: ClientsApi,
  client: QueryClient,
  messageService: MessageService,
): ClientService {
  messageService.reportSystemEffect.subscribeToRequest(async (request) => {
    await client.invalidateQueries({
      queryKey: ["clients"],
    });
    request.resolveCallback();
  });
  return {
    useClients: (query) => {
      return useQuery(
        {
          queryKey: ["clients", "list", query],
          queryFn: () => api.getClients(query),
        },
        client,
      );
    },
    useClient: (id) => {
      return ensureIdleQuery(
        id,
        useQuery(
          {
            queryKey: ["clients", "item", id],
            enabled: maybe.isPresent(id),
            queryFn: () => api.getClient(id!),
          },
          client,
        ),
      );
    },
  };
}
