import { CostApi } from "@/api/cost/cost.api.ts";
import { MessageService } from "@/services/internal/MessageService/MessageService.ts";
import { ensureIdleQuery } from "@/services/io/_commont/ensureIdleQuery.ts";
import { CostService } from "@/services/io/CostService/CostService.ts";
import { maybe } from "@passionware/monads";
import { QueryClient, useQuery } from "@tanstack/react-query";

export function createCostService(
  api: CostApi,
  queryClient: QueryClient,
  messageService: MessageService,
): CostService {
  messageService.reportSystemEffect.subscribeToRequest(async (request) => {
    await queryClient.invalidateQueries({
      queryKey: ["cost"],
    });
    request.sendResponse();
  });
  return {
    useCosts: (query) =>
      useQuery(
        {
          queryKey: ["cost", "list", query],
          queryFn: () => api.getCosts(query),
        },
        queryClient,
      ),
    useCost: (id) =>
      ensureIdleQuery(
        id,
        useQuery(
          {
            enabled: maybe.isPresent(id),
            queryKey: ["cost", "item", id],
            queryFn: () => api.getCost(id!),
          },
          queryClient,
        ),
      ),
  };
}
