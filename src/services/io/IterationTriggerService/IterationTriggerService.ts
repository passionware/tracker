import type {
  BudgetTargetLogEntry,
} from "@/api/iteration-trigger/iteration-trigger.api";
import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api";
import type { Nullable } from "@/platform/typescript/Nullable";
import { Maybe, RemoteData } from "@passionware/monads";

export interface IterationTriggerService {
  /** Fetch log entries for an iteration (imperative, for background sync). */
  getLogEntries: (iterationId: ProjectIteration["id"]) => Promise<BudgetTargetLogEntry[]>;
  /** Current budget target for an iteration (same data as the reactive hook). */
  getCurrentBudgetTarget: (
    iterationId: ProjectIteration["id"],
  ) => Promise<Nullable<number>>;
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
