import type { BudgetTargetLogEntry } from "@/api/iteration-trigger/iteration-trigger.api";
import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api";
import { Maybe, RemoteData } from "@passionware/monads";

export interface IterationTriggerService {
  /** Fetch log entries for an iteration (imperative, for background sync). */
  getLogEntries: (iterationId: ProjectIteration["id"]) => Promise<BudgetTargetLogEntry[]>;
  useBudgetTargetLog: (
    iterationId: Maybe<ProjectIteration["id"]>,
  ) => RemoteData<BudgetTargetLogEntry[]>;
  /** Parallel fetch for many iterations (same query keys as `useBudgetTargetLog`). */
  useBudgetTargetLogsForIterations: (
    iterationIds: readonly ProjectIteration["id"][],
  ) => RemoteData<Map<ProjectIteration["id"], BudgetTargetLogEntry[]>>;
  useCurrentBudgetTarget: (
    iterationId: Maybe<ProjectIteration["id"]>,
  ) => RemoteData<number | null>;
}

export interface WithIterationTriggerService {
  iterationTriggerService: IterationTriggerService;
}
