import { ClientBillingApi } from "@/api/client-billing/client-billing.api.ts";
import { ClientBillingService } from "@/services/io/ClientBillingService/ClientBillingService.ts";
import { QueryClient, useQuery } from "@tanstack/react-query";

export function createClientBillingService(
  api: ClientBillingApi,
  client: QueryClient,
): ClientBillingService {
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
