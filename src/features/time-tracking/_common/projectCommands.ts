import {
  EVENT_VERSION_V1,
  type ProjectEventEnvelope,
  type ProjectEventPayload,
  type ProjectAggregateKind,
  type ExternalLink,
} from "@/api/time-event/time-event.api.ts";
import { newUuid } from "@/features/time-tracking/_common/trackerCommands.ts";

/**
 * Project-stream commands. The TaskManager and ActivityManager UIs share the
 * same submission shape — pick a `ProjectAggregateKind`, mint (or pass) an
 * `aggregateId`, fold the payload into a `projectEvent` envelope, and hand it
 * to {@link EventQueueService.submitProjectEvent}.
 *
 * One UI gesture (rename + reassign + estimate change) should share a single
 * `correlationId` so audit replay shows them as one logical change.
 */
export interface ProjectCommandContext {
  projectId: number;
  correlationId: string;
  aggregateKind: ProjectAggregateKind;
  /** UUID of the aggregate (taskId / activityId / etc.). */
  aggregateId: string;
  /** Optimistic-concurrency token for this aggregate (omit on first event). */
  expectedAggregateVersion?: number;
  /** ISO timestamp; defaults to now. */
  occurredAt?: string;
}

export function buildProjectEnvelope(
  ctx: ProjectCommandContext,
): ProjectEventEnvelope {
  return {
    clientEventId: newUuid(),
    correlationId: ctx.correlationId,
    eventVersion: EVENT_VERSION_V1,
    occurredAt: ctx.occurredAt ?? new Date().toISOString(),
    projectId: ctx.projectId,
    aggregateKind: ctx.aggregateKind,
    aggregateId: ctx.aggregateId,
    expectedAggregateVersion: ctx.expectedAggregateVersion,
  };
}

// ---------------------------------------------------------------------------
// Task payload builders
// ---------------------------------------------------------------------------

export interface CreateTaskCommand {
  taskId?: string;
  clientId: number;
  name: string;
  description?: string;
  externalLinks?: ExternalLink[];
  /** `contractor.id` values — see project-event.schema.ts TaskCreated. */
  assignees?: number[];
  estimate?: { quantity: number; unit: string };
}

export function buildTaskCreatedPayload(
  cmd: CreateTaskCommand,
): { payload: ProjectEventPayload; taskId: string } {
  const taskId = cmd.taskId ?? newUuid();
  return {
    taskId,
    payload: {
      type: "TaskCreated",
      taskId,
      clientId: cmd.clientId,
      name: cmd.name,
      description: cmd.description,
      externalLinks: cmd.externalLinks ?? [],
      assignees: cmd.assignees ?? [],
      estimate: cmd.estimate,
    },
  };
}

export const buildTaskRenamedPayload = (
  taskId: string,
  name: string,
): ProjectEventPayload => ({ type: "TaskRenamed", taskId, name });

export const buildTaskDescriptionChangedPayload = (
  taskId: string,
  description: string | null,
): ProjectEventPayload => ({
  type: "TaskDescriptionChanged",
  taskId,
  description,
});

export const buildTaskExternalLinkAddedPayload = (
  taskId: string,
  link: ExternalLink,
): ProjectEventPayload => ({ type: "TaskExternalLinkAdded", taskId, link });

export const buildTaskExternalLinkRemovedPayload = (
  taskId: string,
  provider: ExternalLink["provider"],
  externalId: string,
): ProjectEventPayload => ({
  type: "TaskExternalLinkRemoved",
  taskId,
  provider,
  externalId,
});

export const buildTaskAssignedPayload = (
  taskId: string,
  contractorId: number,
): ProjectEventPayload => ({ type: "TaskAssigned", taskId, contractorId });

export const buildTaskUnassignedPayload = (
  taskId: string,
  contractorId: number,
): ProjectEventPayload => ({ type: "TaskUnassigned", taskId, contractorId });

export const buildTaskEstimateSetPayload = (
  taskId: string,
  estimate: { quantity: number; unit: string } | null,
): ProjectEventPayload => ({ type: "TaskEstimateSet", taskId, estimate });

export const buildTaskCompletedPayload = (
  taskId: string,
  completedByUserId: string,
  completedAt = new Date().toISOString(),
): ProjectEventPayload => ({
  type: "TaskCompleted",
  taskId,
  completedAt,
  completedByUserId,
});

export const buildTaskReopenedPayload = (
  taskId: string,
  reopenedByUserId: string,
  reopenedAt = new Date().toISOString(),
): ProjectEventPayload => ({
  type: "TaskReopened",
  taskId,
  reopenedAt,
  reopenedByUserId,
});

export const buildTaskArchivedPayload = (
  taskId: string,
): ProjectEventPayload => ({ type: "TaskArchived", taskId });

export const buildTaskUnarchivedPayload = (
  taskId: string,
): ProjectEventPayload => ({ type: "TaskUnarchived", taskId });

// ---------------------------------------------------------------------------
// Activity payload builders
// ---------------------------------------------------------------------------

export interface CreateActivityCommand {
  activityId?: string;
  name: string;
  description?: string;
  kinds?: string[];
}

export function buildActivityCreatedPayload(
  cmd: CreateActivityCommand,
): { payload: ProjectEventPayload; activityId: string } {
  const activityId = cmd.activityId ?? newUuid();
  return {
    activityId,
    payload: {
      type: "ActivityCreated",
      activityId,
      name: cmd.name,
      description: cmd.description,
      kinds: cmd.kinds ?? [],
    },
  };
}

export const buildActivityRenamedPayload = (
  activityId: string,
  name: string,
): ProjectEventPayload => ({ type: "ActivityRenamed", activityId, name });

export const buildActivityDescriptionChangedPayload = (
  activityId: string,
  description: string | null,
): ProjectEventPayload => ({
  type: "ActivityDescriptionChanged",
  activityId,
  description,
});

export const buildActivityKindsChangedPayload = (
  activityId: string,
  kinds: string[],
): ProjectEventPayload => ({ type: "ActivityKindsChanged", activityId, kinds });

export const buildActivityArchivedPayload = (
  activityId: string,
): ProjectEventPayload => ({ type: "ActivityArchived", activityId });

export const buildActivityUnarchivedPayload = (
  activityId: string,
): ProjectEventPayload => ({ type: "ActivityUnarchived", activityId });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Well-known activity kinds. The schema accepts free-form slugs; this list
 * powers the ActivityManager's checkbox row + jump-on filter.
 */
export const KNOWN_ACTIVITY_KINDS = [
  "development",
  "code_review",
  "review",
  "meeting",
  "analysis",
  "jump_on",
  "admin",
] as const;

export type KnownActivityKind = (typeof KNOWN_ACTIVITY_KINDS)[number];

/**
 * Well-known external link providers. Mirrors the Zod enum so the UI never
 * imports the schema directly.
 */
export const EXTERNAL_LINK_PROVIDERS = [
  "linear",
  "gitlab",
  "bitbucket",
  "github",
  "jira",
  "other",
] as const;

export type ExternalLinkProvider = (typeof EXTERNAL_LINK_PROVIDERS)[number];

/**
 * Estimate units we surface to the user. The schema accepts any 1-16 char
 * slug; this list keeps the picker sane for the common cases.
 */
export const ESTIMATE_UNITS = ["h", "d", "pt"] as const;
export type EstimateUnit = (typeof ESTIMATE_UNITS)[number];

/** Convert a quantity in `unit` to seconds for `% over estimate` math. */
export function estimateToSeconds(
  estimate: { quantity: number; unit: string } | null | undefined,
): number | null {
  if (!estimate) return null;
  switch (estimate.unit) {
    case "h":
      return Math.round(estimate.quantity * 3600);
    case "d":
      return Math.round(estimate.quantity * 8 * 3600);
    case "pt":
      // 1 point ~= 4h is the conventional default; teams that reject this
      // can still ship/measure points but won't get an over-estimate %.
      return Math.round(estimate.quantity * 4 * 3600);
    default:
      return null;
  }
}
