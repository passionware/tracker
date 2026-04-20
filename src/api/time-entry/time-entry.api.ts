import type { Client } from "@/api/clients/clients.api";
import type { Contractor } from "@/api/contractor/contractor.api";
import type { Project } from "@/api/project/project.api";
import type { RateSnapshot } from "@/api/time-event/time-event.api";
import type { Workspace } from "@/api/workspace/workspace.api";
import { Nullable } from "@/platform/typescript/Nullable";

/**
 * Approval lifecycle of a time entry. Mirrors the `entry.approval_state`
 * column in the `time_*` projection schema.
 */
export type TimeEntryApprovalState =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

/**
 * One row in the `entry` read-model projection. This is the single, canonical
 * shape of a "time entry" on the frontend — derived from the contractor event
 * stream by the Cloudflare Worker, so we never edit it directly here. UI
 * mutations dispatch events through the event queue; the projection updates
 * after the worker confirms.
 *
 * Numeric IDs (`contractorId`, `projectId`, etc.) match the existing core
 * domain. UUID-typed IDs (`id`, `taskId`, `activityId`, lineage links) are
 * minted by the worker at event-append time.
 */
export interface TimeEntry {
  id: string;
  contractorId: Contractor["id"];
  clientId: Client["id"];
  workspaceId: Workspace["id"];
  projectId: Project["id"];
  /** Null while the entry is still a "placeholder" (`isPlaceholder=true`). */
  taskId: Nullable<string>;
  /** Snapshot of the task's `version` at capture time; null when no task. */
  taskVersion: Nullable<number>;
  activityId: Nullable<string>;
  activityVersion: Nullable<number>;
  startedAt: Date;
  /** Null while the timer is still running. */
  stoppedAt: Nullable<Date>;
  /** Generated column: `stoppedAt - startedAt` in seconds. Null while running. */
  durationSeconds: Nullable<number>;
  description: Nullable<string>;
  tags: string[];
  /** Frozen at start time; refreshed on RateChanged via `EntryRateChanged`. */
  rateSnapshot: RateSnapshot;
  /** `true` when the entry was started without a task/activity and still needs detail. */
  isPlaceholder: boolean;
  approvalState: TimeEntryApprovalState;
  approvalDecidedAt: Nullable<Date>;
  /** auth.uid() of the approver/rejecter. */
  approvalDecidedBy: Nullable<string>;
  approvalReason: Nullable<string>;
  /** Lineage: split source. */
  splitFromEntryId: Nullable<string>;
  /** Lineage: jump-on session pointing back at the paused entry. */
  interruptedEntryId: Nullable<string>;
  /** Lineage: this entry was created by resuming after the linked jump-on. */
  resumedFromEntryId: Nullable<string>;
  /** Soft-delete; the row stays for audit. UI hides deleted by default. */
  deletedAt: Nullable<Date>;
  /** Number of events folded into this row. */
  eventCount: number;
  lastEventId: Nullable<string>;
  lastEventSeq: Nullable<number>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Filter shape for `getEntries`. Each property is optional; the API ANDs the
 * non-empty constraints. Cache keys derived from this shape live in the
 * service's `useEntries` hook.
 */
export interface TimeEntryQuery {
  contractorId?: Contractor["id"];
  projectId?: Project["id"];
  clientId?: Client["id"];
  workspaceId?: Workspace["id"];
  taskId?: string;
  /** Alternative to `taskId` — fetches entries belonging to any of the listed tasks. */
  taskIds?: string[];
  activityId?: string;
  approvalState?: TimeEntryApprovalState | TimeEntryApprovalState[];
  /** Inclusive lower bound on `startedAt`. */
  startedFrom?: Date;
  /** Exclusive upper bound on `startedAt`. */
  startedTo?: Date;
  /** Set true to include soft-deleted entries (default: false). */
  includeDeleted?: boolean;
  /** Set true to only include entries that still need detail (placeholder=true). */
  onlyPlaceholders?: boolean;
  /** Set true to only include entries with `stoppedAt IS NULL` (active timers). */
  onlyActive?: boolean;
  /** Hard cap; defaults to 200 server-side. */
  limit?: number;
}

export interface TimeEntryApi {
  getEntries: (query: TimeEntryQuery) => Promise<TimeEntry[]>;
  getEntry: (entryId: string) => Promise<Nullable<TimeEntry>>;
  /** The currently-running timer for a contractor (the only `stopped_at IS NULL` row). */
  getActiveEntry: (
    contractorId: Contractor["id"],
  ) => Promise<Nullable<TimeEntry>>;
}
