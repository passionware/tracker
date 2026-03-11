import { IterationTriggerApi } from "@/api/iteration-trigger/iteration-trigger.api";
import { WithServices } from "@/platform/typescript/services";
import { WithMessageService } from "@/services/internal/MessageService/MessageService";
import { ensureIdleQuery } from "@/services/io/_common/ensureIdleQuery";
import { IterationTriggerService } from "@/services/io/IterationTriggerService/IterationTriggerService";
import { QueryClient, useQuery } from "@tanstack/react-query";

export function createIterationTriggerService({
  services,
  client,
  api,
}: WithServices<[WithMessageService]> & {
  api: IterationTriggerApi;
  client: QueryClient;
}): IterationTriggerService {
  services.messageService.reportSystemEffect.subscribeToRequest(
    async (request) => {
      await client.invalidateQueries({
        queryKey: ["iteration-budget-target"],
      });
      request.sendResponse();
    },
  );
  return {
    getLogEntries: (iterationId) => api.getLog(iterationId),
    useBudgetTargetLog: (iterationId) =>
      ensureIdleQuery(
        iterationId,
        useQuery(
          {
            enabled: !!iterationId,
            queryKey: ["iteration-budget-target", "log", iterationId],
            queryFn: () => api.getLog(iterationId!),
          },
          client,
        ),
      ),
    useCurrentBudgetTarget: (iterationId) =>
      ensureIdleQuery(
        iterationId,
        useQuery(
          {
            enabled: !!iterationId,
            queryKey: ["iteration-budget-target", "current", iterationId],
            queryFn: () => api.getCurrentBudgetTarget(iterationId!),
          },
          client,
        ),
      ),
  };
}
