import type {
  TaskActuals,
  TaskDefinitionApi,
} from "@/api/task-definition/task-definition.api";
import type { TimeEntryApi } from "@/api/time-entry/time-entry.api";
import { WithServices } from "@/platform/typescript/services";
import { WithMessageService } from "@/services/internal/MessageService/MessageService";
import { ensureIdleQuery } from "@/services/io/_common/ensureIdleQuery";
import type {
  TaskBurndownPoint,
  TaskDefinitionService,
} from "@/services/io/TaskDefinitionService/TaskDefinitionService";
import { rd } from "@passionware/monads";
import { QueryClient, useQueries, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMemo } from "react";

const ROOT_KEY = "task-definition";

export function createTaskDefinitionService({
  services,
  client,
  api,
  timeEntryApi,
}: WithServices<[WithMessageService]> & {
  api: TaskDefinitionApi;
  timeEntryApi: TimeEntryApi;
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
    useTaskBurndownSeries: (taskIds, days) => {
      // One batched HTTP round trip: all entries matching the visible task
      // set in the last `days` days. We then fold into a daily cumulative
      // series per task in JS — dev data volume makes this comfortable.
      const stableIds = useMemo(() => [...taskIds].sort(), [taskIds]);
      const startedFrom = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - (days - 1));
        return d;
      }, [days]);
      const query = useQuery(
        {
          enabled: stableIds.length > 0,
          queryKey: [
            ROOT_KEY,
            "burndown",
            stableIds,
            format(startedFrom, "yyyy-MM-dd"),
          ] as const,
          queryFn: () =>
            timeEntryApi.getEntries({
              taskIds: stableIds,
              startedFrom,
              limit: 2000,
            }),
        },
        client,
      );
      return useMemo(() => {
        if (stableIds.length === 0) return rd.of(new Map());
        if (query.isLoading) return rd.ofIdle();
        if (query.error) {
          return rd.ofError(
            query.error instanceof Error
              ? query.error
              : new Error(String(query.error)),
          );
        }
        return rd.of(
          buildBurndownSeries(stableIds, startedFrom, days, query.data ?? []),
        );
      }, [stableIds, startedFrom, days, query.data, query.isLoading, query.error]);
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

function buildBurndownSeries(
  taskIds: readonly string[],
  startedFrom: Date,
  days: number,
  entries: Awaited<ReturnType<TimeEntryApi["getEntries"]>>,
): Map<string, TaskBurndownPoint[]> {
  const dayKeys = buildDayKeys(startedFrom, days);
  const perTaskDaily = new Map<string, Map<string, number>>();
  for (const taskId of taskIds) {
    perTaskDaily.set(taskId, new Map());
  }

  for (const e of entries) {
    if (e.taskId === null || e.deletedAt !== null) continue;
    const bucket = perTaskDaily.get(e.taskId);
    if (!bucket) continue;
    if (e.durationSeconds === null) continue;
    const key = format(e.startedAt, "yyyy-MM-dd");
    bucket.set(key, (bucket.get(key) ?? 0) + e.durationSeconds);
  }

  const out = new Map<string, TaskBurndownPoint[]>();
  for (const [taskId, daily] of perTaskDaily) {
    let cumulative = 0;
    const points: TaskBurndownPoint[] = [];
    let anyActivity = false;
    for (const day of dayKeys) {
      const delta = daily.get(day) ?? 0;
      if (delta > 0) anyActivity = true;
      cumulative += delta;
      points.push({ day, cumulativeSeconds: cumulative });
    }
    out.set(taskId, anyActivity ? points : []);
  }
  return out;
}

function buildDayKeys(from: Date, days: number): string[] {
  const out: string[] = [];
  const d = new Date(from);
  for (let i = 0; i < days; i++) {
    out.push(format(d, "yyyy-MM-dd"));
    d.setDate(d.getDate() + 1);
  }
  return out;
}
