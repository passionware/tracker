import type {
  TaskActuals,
  TaskDefinitionApi,
} from "@/api/task-definition/task-definition.api";
import { WithServices } from "@/platform/typescript/services";
import { WithMessageService } from "@/services/internal/MessageService/MessageService";
import { ensureIdleQuery } from "@/services/io/_common/ensureIdleQuery";
import type { TaskDefinitionService } from "@/services/io/TaskDefinitionService/TaskDefinitionService";
import { rd } from "@passionware/monads";
import { QueryClient, useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

const ROOT_KEY = "task-definition";

export function createTaskDefinitionService({
  services,
  client,
  api,
}: WithServices<[WithMessageService]> & {
  api: TaskDefinitionApi;
  client: QueryClient;
}): TaskDefinitionService {
  services.messageService.reportSystemEffect.subscribeToRequest(
    async (request) => {
      await client.invalidateQueries({ queryKey: [ROOT_KEY] });
      request.sendResponse();
    },
  );

  return {
    getTasks: (query) => api.getTasks(query),
    useTasks: (query) =>
      useQuery(
        {
          queryKey: [ROOT_KEY, "list", query] as const,
          queryFn: () => api.getTasks(query),
        },
        client,
      ),
    useTask: (taskId) =>
      ensureIdleQuery(
        taskId,
        useQuery(
          {
            enabled: !!taskId,
            queryKey: [ROOT_KEY, "task", taskId] as const,
            queryFn: () => api.getTask(taskId!),
          },
          client,
        ),
      ),
    useSuggestionsForContractor: (contractorAuthUid, opts) =>
      ensureIdleQuery(
        contractorAuthUid,
        useQuery(
          {
            enabled: !!contractorAuthUid,
            queryKey: [ROOT_KEY, "suggestions", contractorAuthUid, opts] as const,
            queryFn: () =>
              api.getSuggestionsForContractor(contractorAuthUid!, opts),
          },
          client,
        ),
      ),
    useTaskActuals: (taskId) =>
      ensureIdleQuery(
        taskId,
        useQuery(
          {
            enabled: !!taskId,
            queryKey: [ROOT_KEY, "actuals", taskId] as const,
            queryFn: () => api.getTaskActuals(taskId!),
          },
          client,
        ),
      ),
    useTaskActualsForTasks: (taskIds) => {
      const queries = useQueries(
        {
          queries: taskIds.map((id) => ({
            queryKey: [ROOT_KEY, "actuals", id] as const,
            queryFn: () => api.getTaskActuals(id),
          })),
        },
        client,
      );
      return useMemo(() => {
        if (taskIds.length === 0) return rd.of(new Map());
        if (queries.some((q) => q.isLoading)) return rd.ofIdle();
        const failed = queries.find((q) => q.isError);
        if (failed?.error) {
          return rd.ofError(
            failed.error instanceof Error
              ? failed.error
              : new Error(String(failed.error)),
          );
        }
        const m = new Map<string, TaskActuals>();
        for (let i = 0; i < taskIds.length; i++) {
          const result = queries[i]!.data as TaskActuals | null;
          if (result) m.set(taskIds[i]!, result);
        }
        return rd.of(m);
      }, [taskIds, queries]);
    },
    useActiveTaskForContractor: (contractorId) =>
      ensureIdleQuery(
        contractorId,
        useQuery(
          {
            enabled: contractorId !== undefined && contractorId !== null,
            queryKey: [ROOT_KEY, "active-for-contractor", contractorId] as const,
            queryFn: () => api.getActiveTaskForContractor(contractorId!),
          },
          client,
        ),
      ),
  };
}
