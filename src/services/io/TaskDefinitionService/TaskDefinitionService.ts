import type { Contractor } from "@/api/contractor/contractor.api";
import type { Project } from "@/api/project/project.api";
import type {
  TaskActuals,
  TaskDefinition,
  TaskDefinitionQuery,
} from "@/api/task-definition/task-definition.api";
import type { Maybe, RemoteData } from "@passionware/monads";

export interface TaskDefinitionService {
  getTasks: (query: TaskDefinitionQuery) => Promise<TaskDefinition[]>;
  useTasks: (query: TaskDefinitionQuery) => RemoteData<TaskDefinition[]>;
  useTask: (taskId: Maybe<string>) => RemoteData<TaskDefinition | null>;
  /**
   * Suggestion list for the start-timer menu — open, non-archived tasks
   * assigned to this contractor. Optionally constrained to one project.
   */
  useSuggestionsForContractor: (
    contractorAuthUid: Maybe<string>,
    opts?: { projectId?: Project["id"]; limit?: number },
  ) => RemoteData<TaskDefinition[]>;
  useTaskActuals: (taskId: Maybe<string>) => RemoteData<TaskActuals | null>;
  useTaskActualsForTasks: (
    taskIds: readonly string[],
  ) => RemoteData<Map<string, TaskActuals>>;
  /**
   * Per-task daily burndown: returns, for each task, an array of
   * `{ day, cumulativeSeconds }` points covering the last `days` days
   * (inclusive of today). Used by the sparkline on the Tasks page.
   *
   * Tasks with no activity in the window get an empty series.
   */
  useTaskBurndownSeries: (
    taskIds: readonly string[],
    days: number,
  ) => RemoteData<Map<string, TaskBurndownPoint[]>>;
  /** "What is X currently working on?" — the basis of the jump-on quick row. */
  useActiveTaskForContractor: (
    contractorId: Maybe<Contractor["id"]>,
  ) => RemoteData<TaskDefinition | null>;
}

export interface TaskBurndownPoint {
  /** Local-day key, format `yyyy-MM-dd`. */
  day: string;
  /** Cumulative seconds spent on this task up to and including `day`. */
  cumulativeSeconds: number;
}

export interface WithTaskDefinitionService {
  taskDefinitionService: TaskDefinitionService;
}
