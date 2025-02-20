import { BillingApi } from "@/api/billing/billing.api.ts";
import { MessageService } from "@/services/internal/MessageService/MessageService.ts";
import { BillingService } from "@/services/io/BillingService/BillingService.ts";
import { QueryClient, useQuery } from "@tanstack/react-query";

export function createBillingService(
  api: BillingApi,
  client: QueryClient,
  messageService: MessageService,
): BillingService {
  messageService.reportSystemEffect.subscribeToRequest(async (request) => {
    await client.invalidateQueries({
      queryKey: ["billing"],
    });
    request.sendResponse();
  });
  return {
    useBillings: (query) => {
      return useQuery(
        {
          queryKey: ["billing", "list", query],
          queryFn: () => api.getBillings(query),
        },
        client,
      );
    },
  };
}
