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
  /** "What is X currently working on?" — the basis of the jump-on quick row. */
  useActiveTaskForContractor: (
    contractorId: Maybe<Contractor["id"]>,
  ) => RemoteData<TaskDefinition | null>;
}

export interface WithTaskDefinitionService {
  taskDefinitionService: TaskDefinitionService;
}
