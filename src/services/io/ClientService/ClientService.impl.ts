import { ClientsApi } from "@/api/clients/clients.api.ts";
import { MessageService } from "@/services/internal/MessageService/MessageService.ts";
import { ClientService } from "@/services/io/ClientService/ClientService.ts";
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
    useClients: () => {
      return useQuery(
        {
          queryKey: ["clients", "list"],
          queryFn: api.getClients,
        },
        client,
      );
    },
    useClient: (id) => {
      return useQuery(
        {
          queryKey: ["clients", "item", id],
          queryFn: () => api.getClient(id),
        },
        client,
      );
    },
  };
}
