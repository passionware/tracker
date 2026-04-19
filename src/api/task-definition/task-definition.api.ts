import type { Client } from "@/api/clients/clients.api";
import type { Contractor } from "@/api/contractor/contractor.api";
import type { Project } from "@/api/project/project.api";
import type { ExternalLink } from "@/api/time-event/time-event.api";
import { Nullable } from "@/platform/typescript/Nullable";

/**
 * One row in `task_current` — the most recent state of a project task.
 * Tasks live in the project event stream (aggregate_kind=task) and are
 * derived to this projection by the worker.
 */
export interface TaskDefinition {
  id: string;
  projectId: Project["id"];
  clientId: Client["id"];
  name: string;
  description: Nullable<string>;
  /** Linear/GitLab/Bitbucket/git-branch/url links. See `ExternalLink`. */
  externalLinks: ExternalLink[];
  /** auth.uid() values of contractors who can see this task as a suggestion. Empty = unassigned. */
  assignees: string[];
  /** Estimated quantity in {@link estimateUnit}; used for the `% over estimate` UI. */
  estimateQuantity: Nullable<number>;
  estimateUnit: Nullable<string>;
  completedAt: Nullable<Date>;
  /** auth.uid() that flipped the task to completed. */
  completedBy: Nullable<string>;
  isArchived: boolean;
  version: number;
  lastEventId: Nullable<string>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * One row in the `task_actuals` view. Aggregates over `entry` per task.
 * `billingCurrency` is null when entries on the task mix billing currencies.
 */
export interface TaskActuals {
  taskId: string;
  entryCountTotal: number;
  entryCountActive: number;
  totalSeconds: number;
  totalNetValue: number;
  billingCurrency: Nullable<string>;
  firstStartedAt: Nullable<Date>;
  lastStoppedAt: Nullable<Date>;
}

export interface TaskDefinitionQuery {
  projectId?: Project["id"];
  clientId?: Client["id"];
  /** Restrict to tasks assigned to this contractor (used for suggestion menus). */
  assignedToUserId?: string;
  /** Default false — completed tasks are usually noise in pickers. */
  includeCompleted?: boolean;
  /** Default false — archived tasks are hidden from normal lists. */
  includeArchived?: boolean;
  /** Server-side cap; defaults to 200. */
  limit?: number;
}

export interface TaskDefinitionApi {
  getTasks: (query: TaskDefinitionQuery) => Promise<TaskDefinition[]>;
  getTask: (taskId: string) => Promise<Nullable<TaskDefinition>>;
  /**
   * Open, non-archived tasks the contractor can see (assigned to them OR
   * unassigned in the projects they have time on). Used by the start-timer
   * suggestion list.
   */
  getSuggestionsForContractor: (
    contractorAuthUid: string,
    opts?: { projectId?: Project["id"]; limit?: number },
  ) => Promise<TaskDefinition[]>;
  getTaskActuals: (taskId: string) => Promise<Nullable<TaskActuals>>;
  /** Batched read for the `% over estimate` summary on a tasks page. */
  getTaskActualsForTasks: (taskIds: readonly string[]) => Promise<TaskActuals[]>;
  /** Helper for the contractor avatar row that resolves "I want to jump on X's current task". */
  getActiveTaskForContractor: (
    contractorId: Contractor["id"],
  ) => Promise<Nullable<TaskDefinition>>;
}
