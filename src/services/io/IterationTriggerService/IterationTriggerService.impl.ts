import {
  type BudgetTargetLogEntry,
  IterationTriggerApi,
} from "@/api/iteration-trigger/iteration-trigger.api";
import { WithServices } from "@/platform/typescript/services";
import { WithMessageService } from "@/services/internal/MessageService/MessageService";
import { ensureIdleQuery } from "@/services/io/_common/ensureIdleQuery";
import { IterationTriggerService } from "@/services/io/IterationTriggerService/IterationTriggerService";
import { QueryClient, useQueries, useQuery } from "@tanstack/react-query";
import { rd } from "@passionware/monads";
import { useMemo } from "react";

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
    getCurrentBudgetTarget: (iterationId) =>
      api.getCurrentBudgetTarget(iterationId),
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
    useBudgetTargetLogsForIterations: (iterationIds) => {
      const queries = useQueries(
        {
          queries: iterationIds.map((id) => ({
            queryKey: ["iteration-budget-target", "log", id] as const,
            queryFn: () => api.getLog(id),
          })),
        },
        client,
      );
      return useMemo(() => {
        if (iterationIds.length === 0) {
          return rd.of(new Map());
        }
        if (queries.some((q) => q.isLoading)) {
          return rd.ofIdle();
        }
        const failed = queries.find((q) => q.isError);
        if (failed?.error) {
          return rd.ofError(
            failed.error instanceof Error
              ? failed.error
              : new Error(String(failed.error)),
          );
        }
        const m = new Map<number, BudgetTargetLogEntry[]>();
        for (let i = 0; i < iterationIds.length; i++) {
          m.set(iterationIds[i]!, (queries[i]!.data as BudgetTargetLogEntry[]) ?? []);
        }
        return rd.of(m);
      }, [iterationIds, queries]);
    },
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
