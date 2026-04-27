import { BillingApi } from "@/api/billing/billing.api.ts";
import { MessageService } from "@/services/internal/MessageService/MessageService.ts";
import { BillingService } from "@/services/io/BillingService/BillingService.ts";
import { QueryClient, useQueries, useQuery } from "@tanstack/react-query";
import { ensureIdleQuery } from "../_common/ensureIdleQuery";
import { maybe, rd } from "@passionware/monads";

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
      return ensureIdleQuery(
        query,
        useQuery(
          {
            enabled: maybe.isPresent(query),
            queryKey: ["billing", "list", query],
            queryFn: () => api.getBillings(query!),
          },
          client,
        ),
      );
    },
    useBilling: (id) => {
      return ensureIdleQuery(
        id,
        useQuery(
          {
            enabled: maybe.isPresent(id),
            queryKey: ["billing", "item", id],
            queryFn: () => api.getBilling(id!),
          },
          client,
        ),
      );
    },
    useBillingsByIds: (ids) => {
      const idList = maybe.mapOrElse(ids, (list) => list, [] as number[]);
      const results = useQueries(
        {
          queries: idList.map((id) => ({
            queryKey: ["billing", "item", id],
            queryFn: () => api.getBilling(id),
          })),
        },
        client,
      );
      return rd.useMemoMap(
        ensureIdleQuery(ids, rd.combineAll(results)),
        (billings) => billings,
      );
    },
  };
}
