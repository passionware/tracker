/**
 * Project-stream aggregate: pure-TS reducer + command validator.
 *
 * The project stream holds 4 sub-aggregate kinds (`task` / `activity` / `rate`
 * / `period_lock`); the envelope's `aggregateKind` + `aggregateId` route a
 * given event to the right sub-aggregate. Per-aggregate optimistic concurrency
 * is the Worker's job (using `expectedAggregateVersion` against
 * `project_aggregate_head`). The validator below only enforces stream-internal
 * invariants given the current state.
 *
 * Pure-TS / immer / Zod-typed input. Safe to run in a Cloudflare Worker.
 */

import { produce } from "immer";
import {
  type ProjectEventPayload,
  type ProjectAggregateKind,
  type RateDefinition,
  type ExternalLink,
} from "@/api/time-event/time-event.api.ts";
import {
  type AggregateContext,
  type ValidationError,
  type ValidationResult,
  fail,
  ok,
  unreachable,
} from "@/api/time-event/aggregates/types.ts";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface TaskState {
  taskId: string;
  projectId: number;
  clientId: number;
  name: string;
  description: string | null;
  externalLinks: ExternalLink[];
  assignees: string[];
  estimate: { quantity: number; unit: string } | null;
  completedAt: string | null;
  completedByUserId: string | null;
  archivedAt: string | null;
  /** Bumped on every applied event for this task. Surfaces as the snapshot
   *  version stored on time entries. */
  version: number;
}

export interface ActivityState {
  activityId: string;
  projectId: number;
  name: string;
  description: string | null;
  kinds: string[];
  archivedAt: string | null;
  version: number;
}

export interface RateState {
  rateAggregateId: string;
  projectId: number;
  contractorId: number;
  current: RateDefinition;
  effectiveFrom: string; // YYYY-MM-DD
  isActive: boolean;
  version: number;
}

export interface PeriodLockState {
  lockId: string;
  projectId: number;
  /** `null` means "all contractors on this project". */
  contractorId: number | null;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  lockedAt: string;
  lockedByUserId: string;
  unlockedAt: string | null;
  unlockedByUserId: string | null;
  reason: string | null;
  version: number;
}

export interface ProjectStreamState {
  /** `null` until the first event is applied. */
  projectId: number | null;
  tasks: Record<string, TaskState>;
  activities: Record<string, ActivityState>;
  rates: Record<string, RateState>;
  periodLocks: Record<string, PeriodLockState>;
}

export const emptyProjectStreamState: ProjectStreamState = Object.freeze({
  projectId: null,
  tasks: Object.freeze({}),
  activities: Object.freeze({}),
  rates: Object.freeze({}),
  periodLocks: Object.freeze({}),
}) as ProjectStreamState;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function err(
  code: ValidationError["code"],
  message: string,
  details?: Record<string, unknown>,
): ValidationError {
  return { code, message, details };
}

function externalLinkKey(provider: string, externalId: string): string {
  return `${provider}:${externalId}`;
}

/**
 * Returns `true` when the given `(projectId, contractorId, occurredAt)` falls
 * inside any active (locked, not yet unlocked) period lock. Useful for the
 * contractor-stream validator's `isLockedAt` callback.
 */
export function isPeriodLockedAt(
  state: ProjectStreamState,
  input: { projectId: number; contractorId: number; occurredAt: string },
): boolean {
  if (state.projectId !== null && state.projectId !== input.projectId) {
    return false;
  }
  // A lock window covers `[periodStart, periodEnd]` (inclusive) — convert to
  // ms via `T00:00:00Z` and `T23:59:59.999Z` for the half-open compare.
  const at = Date.parse(input.occurredAt);
  for (const lock of Object.values(state.periodLocks)) {
    if (lock.unlockedAt !== null) continue;
    if (lock.contractorId !== null && lock.contractorId !== input.contractorId)
      continue;
    const startMs = Date.parse(`${lock.periodStart}T00:00:00.000Z`);
    const endMs = Date.parse(`${lock.periodEnd}T23:59:59.999Z`);
    if (at >= startMs && at <= endMs) return true;
  }
  return false;
}

/** Compose `(projectId, contractorId)` lookup over the rate index. */
export function findActiveRate(
  state: ProjectStreamState,
  contractorId: number,
): RateState | undefined {
  for (const r of Object.values(state.rates)) {
    if (r.isActive && r.contractorId === contractorId) return r;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function applyProjectEvent(
  state: ProjectStreamState,
  payload: ProjectEventPayload,
  meta: {
    occurredAt: string;
    projectId: number;
    aggregateKind: ProjectAggregateKind;
    aggregateId: string;
  },
): ProjectStreamState {
  return produce(state, (draft) => {
    if (draft.projectId === null) {
      draft.projectId = meta.projectId;
    }

    switch (payload.type) {
      // ───────── task ─────────
      case "TaskCreated": {
        draft.tasks[payload.taskId] = {
          taskId: payload.taskId,
          projectId: meta.projectId,
          clientId: payload.clientId,
          name: payload.name,
          description: payload.description ?? null,
          externalLinks: [...payload.externalLinks],
          assignees: [...payload.assignees],
          estimate: payload.estimate ?? null,
          completedAt: null,
          completedByUserId: null,
          archivedAt: null,
          version: 1,
        };
        return;
      }
      case "TaskRenamed": {
        const t = draft.tasks[payload.taskId];
        if (!t) throw new Error(`apply: unknown task ${payload.taskId}`);
        t.name = payload.name;
        t.version += 1;
        return;
      }
      case "TaskDescriptionChanged": {
        const t = draft.tasks[payload.taskId];
        if (!t) throw new Error(`apply: unknown task ${payload.taskId}`);
        t.description = payload.description;
        t.version += 1;
        return;
      }
      case "TaskExternalLinkAdded": {
        const t = draft.tasks[payload.taskId];
        if (!t) throw new Error(`apply: unknown task ${payload.taskId}`);
        t.externalLinks.push(payload.link);
        t.version += 1;
        return;
      }
      case "TaskExternalLinkRemoved": {
        const t = draft.tasks[payload.taskId];
        if (!t) throw new Error(`apply: unknown task ${payload.taskId}`);
        t.externalLinks = t.externalLinks.filter(
          (l) =>
            !(l.provider === payload.provider && l.externalId === payload.externalId),
        );
        t.version += 1;
        return;
      }
      case "TaskAssigned": {
        const t = draft.tasks[payload.taskId];
        if (!t) throw new Error(`apply: unknown task ${payload.taskId}`);
        if (!t.assignees.includes(payload.userId)) t.assignees.push(payload.userId);
        t.version += 1;
        return;
      }
      case "TaskUnassigned": {
        const t = draft.tasks[payload.taskId];
        if (!t) throw new Error(`apply: unknown task ${payload.taskId}`);
        t.assignees = t.assignees.filter((u) => u !== payload.userId);
        t.version += 1;
        return;
      }
      case "TaskEstimateSet": {
        const t = draft.tasks[payload.taskId];
        if (!t) throw new Error(`apply: unknown task ${payload.taskId}`);
        t.estimate = payload.estimate;
        t.version += 1;
        return;
      }
      case "TaskCompleted": {
        const t = draft.tasks[payload.taskId];
        if (!t) throw new Error(`apply: unknown task ${payload.taskId}`);
        t.completedAt = payload.completedAt;
        t.completedByUserId = payload.completedByUserId;
        t.version += 1;
        return;
      }
      case "TaskReopened": {
        const t = draft.tasks[payload.taskId];
        if (!t) throw new Error(`apply: unknown task ${payload.taskId}`);
        t.completedAt = null;
        t.completedByUserId = null;
        t.version += 1;
        return;
      }
      case "TaskArchived": {
        const t = draft.tasks[payload.taskId];
        if (!t) throw new Error(`apply: unknown task ${payload.taskId}`);
        t.archivedAt = meta.occurredAt;
        t.version += 1;
        return;
      }
      case "TaskUnarchived": {
        const t = draft.tasks[payload.taskId];
        if (!t) throw new Error(`apply: unknown task ${payload.taskId}`);
        t.archivedAt = null;
        t.version += 1;
        return;
      }

      // ───────── activity ─────────
      case "ActivityCreated": {
        draft.activities[payload.activityId] = {
          activityId: payload.activityId,
          projectId: meta.projectId,
          name: payload.name,
          description: payload.description ?? null,
          kinds: [...payload.kinds],
          archivedAt: null,
          version: 1,
        };
        return;
      }
      case "ActivityRenamed": {
        const a = draft.activities[payload.activityId];
        if (!a) throw new Error(`apply: unknown activity ${payload.activityId}`);
        a.name = payload.name;
        a.version += 1;
        return;
      }
      case "ActivityDescriptionChanged": {
        const a = draft.activities[payload.activityId];
        if (!a) throw new Error(`apply: unknown activity ${payload.activityId}`);
        a.description = payload.description;
        a.version += 1;
        return;
      }
      case "ActivityKindsChanged": {
        const a = draft.activities[payload.activityId];
        if (!a) throw new Error(`apply: unknown activity ${payload.activityId}`);
        a.kinds = [...payload.kinds];
        a.version += 1;
        return;
      }
      case "ActivityArchived": {
        const a = draft.activities[payload.activityId];
        if (!a) throw new Error(`apply: unknown activity ${payload.activityId}`);
        a.archivedAt = meta.occurredAt;
        a.version += 1;
        return;
      }
      case "ActivityUnarchived": {
        const a = draft.activities[payload.activityId];
        if (!a) throw new Error(`apply: unknown activity ${payload.activityId}`);
        a.archivedAt = null;
        a.version += 1;
        return;
      }

      // ───────── rate ─────────
      case "RateSet": {
        const existing = draft.rates[payload.rateAggregateId];
        if (!existing) {
          draft.rates[payload.rateAggregateId] = {
            rateAggregateId: payload.rateAggregateId,
            projectId: meta.projectId,
            contractorId: payload.contractorId,
            current: payload.rate,
            effectiveFrom: payload.effectiveFrom,
            isActive: true,
            version: 1,
          };
        } else {
          existing.current = payload.rate;
          existing.effectiveFrom = payload.effectiveFrom;
          existing.contractorId = payload.contractorId;
          existing.isActive = true;
          existing.version += 1;
        }
        return;
      }
      case "RateUnset": {
        const r = draft.rates[payload.rateAggregateId];
        if (!r) throw new Error(`apply: unknown rate ${payload.rateAggregateId}`);
        r.isActive = false;
        r.effectiveFrom = payload.effectiveFrom;
        r.version += 1;
        return;
      }

      // ───────── period lock ─────────
      case "PeriodLocked": {
        draft.periodLocks[payload.lockId] = {
          lockId: payload.lockId,
          projectId: meta.projectId,
          contractorId: payload.contractorId,
          periodStart: payload.periodStart,
          periodEnd: payload.periodEnd,
          lockedAt: payload.lockedAt,
          lockedByUserId: payload.lockedByUserId,
          unlockedAt: null,
          unlockedByUserId: null,
          reason: payload.reason ?? null,
          version: 1,
        };
        return;
      }
      case "PeriodUnlocked": {
        const l = draft.periodLocks[payload.lockId];
        if (!l) throw new Error(`apply: unknown lock ${payload.lockId}`);
        l.unlockedAt = payload.unlockedAt;
        l.unlockedByUserId = payload.unlockedByUserId;
        if (payload.reason !== undefined) l.reason = payload.reason;
        l.version += 1;
        return;
      }

      default:
        return unreachable(payload);
    }
  });
}

/**
 * Fold an entire stream from scratch.
 */
export function replayProjectStream(
  projectId: number,
  events: ReadonlyArray<{
    payload: ProjectEventPayload;
    occurredAt: string;
    aggregateKind: ProjectAggregateKind;
    aggregateId: string;
  }>,
): ProjectStreamState {
  let state = emptyProjectStreamState;
  for (const e of events) {
    state = applyProjectEvent(state, e.payload, {
      projectId,
      occurredAt: e.occurredAt,
      aggregateKind: e.aggregateKind,
      aggregateId: e.aggregateId,
    });
  }
  return state;
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

export function validateProjectEvent(
  state: ProjectStreamState,
  payload: ProjectEventPayload,
  _ctx: AggregateContext,
): ValidationResult {
  switch (payload.type) {
    // ───────── task ─────────
    case "TaskCreated": {
      if (state.tasks[payload.taskId])
        return fail(err("task.already_exists", "task id already exists"));
      return ok();
    }
    case "TaskRenamed":
    case "TaskDescriptionChanged":
    case "TaskEstimateSet": {
      const t = state.tasks[payload.taskId];
      if (!t) return fail(err("task.not_found", "task not found"));
      if (t.archivedAt !== null)
        return fail(err("task.already_archived", "task is archived"));
      return ok();
    }
    case "TaskExternalLinkAdded": {
      const t = state.tasks[payload.taskId];
      if (!t) return fail(err("task.not_found", "task not found"));
      if (t.archivedAt !== null)
        return fail(err("task.already_archived", "task is archived"));
      const present = t.externalLinks.some(
        (l) =>
          externalLinkKey(l.provider, l.externalId) ===
          externalLinkKey(payload.link.provider, payload.link.externalId),
      );
      if (present)
        return fail(
          err(
            "task.external_link_already_present",
            "external link already attached",
            {
              provider: payload.link.provider,
              externalId: payload.link.externalId,
            },
          ),
        );
      return ok();
    }
    case "TaskExternalLinkRemoved": {
      const t = state.tasks[payload.taskId];
      if (!t) return fail(err("task.not_found", "task not found"));
      const present = t.externalLinks.some(
        (l) =>
          externalLinkKey(l.provider, l.externalId) ===
          externalLinkKey(payload.provider, payload.externalId),
      );
      if (!present)
        return fail(
          err(
            "task.external_link_not_present",
            "external link is not attached",
            { provider: payload.provider, externalId: payload.externalId },
          ),
        );
      return ok();
    }
    case "TaskAssigned": {
      const t = state.tasks[payload.taskId];
      if (!t) return fail(err("task.not_found", "task not found"));
      if (t.archivedAt !== null)
        return fail(err("task.already_archived", "task is archived"));
      if (t.assignees.includes(payload.userId))
        return fail(
          err("task.assignee_already_present", "user is already assigned"),
        );
      return ok();
    }
    case "TaskUnassigned": {
      const t = state.tasks[payload.taskId];
      if (!t) return fail(err("task.not_found", "task not found"));
      if (!t.assignees.includes(payload.userId))
        return fail(
          err("task.assignee_not_present", "user is not assigned"),
        );
      return ok();
    }
    case "TaskCompleted": {
      const t = state.tasks[payload.taskId];
      if (!t) return fail(err("task.not_found", "task not found"));
      if (t.archivedAt !== null)
        return fail(err("task.already_archived", "task is archived"));
      if (t.completedAt !== null)
        return fail(err("task.already_completed", "task already completed"));
      return ok();
    }
    case "TaskReopened": {
      const t = state.tasks[payload.taskId];
      if (!t) return fail(err("task.not_found", "task not found"));
      if (t.completedAt === null)
        return fail(err("task.not_completed", "task is not completed"));
      return ok();
    }
    case "TaskArchived": {
      const t = state.tasks[payload.taskId];
      if (!t) return fail(err("task.not_found", "task not found"));
      if (t.archivedAt !== null)
        return fail(err("task.already_archived", "task already archived"));
      return ok();
    }
    case "TaskUnarchived": {
      const t = state.tasks[payload.taskId];
      if (!t) return fail(err("task.not_found", "task not found"));
      if (t.archivedAt === null)
        return fail(err("task.not_archived", "task is not archived"));
      return ok();
    }

    // ───────── activity ─────────
    case "ActivityCreated": {
      if (state.activities[payload.activityId])
        return fail(err("activity.already_exists", "activity id already exists"));
      return ok();
    }
    case "ActivityRenamed":
    case "ActivityDescriptionChanged":
    case "ActivityKindsChanged": {
      const a = state.activities[payload.activityId];
      if (!a) return fail(err("activity.not_found", "activity not found"));
      if (a.archivedAt !== null)
        return fail(err("activity.already_archived", "activity is archived"));
      return ok();
    }
    case "ActivityArchived": {
      const a = state.activities[payload.activityId];
      if (!a) return fail(err("activity.not_found", "activity not found"));
      if (a.archivedAt !== null)
        return fail(
          err("activity.already_archived", "activity already archived"),
        );
      return ok();
    }
    case "ActivityUnarchived": {
      const a = state.activities[payload.activityId];
      if (!a) return fail(err("activity.not_found", "activity not found"));
      if (a.archivedAt === null)
        return fail(err("activity.not_archived", "activity is not archived"));
      return ok();
    }

    // ───────── rate ─────────
    case "RateSet": {
      const existing = state.rates[payload.rateAggregateId];
      if (existing) {
        if (existing.contractorId !== payload.contractorId) {
          return fail(
            err(
              "rate.contractor_mismatch",
              "rate aggregate is bound to a different contractor",
              {
                aggregateContractorId: existing.contractorId,
                payloadContractorId: payload.contractorId,
              },
            ),
          );
        }
        if (payload.effectiveFrom <= existing.effectiveFrom) {
          return fail(
            err(
              "rate.effective_from_not_after_current",
              "RateSet must have effectiveFrom strictly after the current rate",
              {
                currentEffectiveFrom: existing.effectiveFrom,
                payloadEffectiveFrom: payload.effectiveFrom,
              },
            ),
          );
        }
      }
      // Reject if a *different* rate aggregate is already active for the
      // same (project, contractor) — operator must explicitly RateUnset
      // before opening a new aggregate to avoid silent overlaps.
      const otherActive = Object.values(state.rates).find(
        (r) =>
          r.isActive &&
          r.contractorId === payload.contractorId &&
          r.rateAggregateId !== payload.rateAggregateId,
      );
      if (otherActive) {
        return fail(
          err(
            "rate.already_exists",
            "another rate aggregate is already active for this contractor — unset it first",
            { otherAggregateId: otherActive.rateAggregateId },
          ),
        );
      }
      return ok();
    }
    case "RateUnset": {
      const r = state.rates[payload.rateAggregateId];
      if (!r) return fail(err("rate.not_found", "rate not found"));
      return ok();
    }

    // ───────── period lock ─────────
    case "PeriodLocked": {
      if (state.periodLocks[payload.lockId])
        return fail(err("lock.already_exists", "lock id already exists"));
      return ok();
    }
    case "PeriodUnlocked": {
      const l = state.periodLocks[payload.lockId];
      if (!l) return fail(err("lock.not_found", "lock not found"));
      if (l.unlockedAt !== null)
        return fail(err("lock.already_unlocked", "lock already unlocked"));
      return ok();
    }

    default:
      return unreachable(payload);
  }
}
