import { ClientBillingApi } from "@/api/client-billing/client-billing.api.ts";
import { MessageService } from "@/services/internal/MessageService/MessageService.ts";
import { ClientBillingService } from "@/services/io/ClientBillingService/ClientBillingService.ts";
import { QueryClient, useQuery } from "@tanstack/react-query";

export function createClientBillingService(
  api: ClientBillingApi,
  client: QueryClient,
  messageService: MessageService,
): ClientBillingService {
  messageService.reportSystemEffect.subscribeToRequest(async (request) => {
    await client.invalidateQueries({
      queryKey: ["client_billings"],
    });
    request.resolveCallback();
  });
  return {
    useClientBillings: (query) => {
      return useQuery(
        {
          queryKey: ["client_billings", "list", query],
          queryFn: () => api.getClientBillings(query),
        },
        client,
      );
    },
  };
}
