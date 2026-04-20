/**
 * Contractor-stream aggregate: pure-TS reducer + command validator.
 *
 * Single source of truth for "given the current contractor's event stream,
 * which events are valid to append next?". Used by:
 *   - the Cloudflare Worker (authoritative validation)
 *   - the frontend optimistic-UI overlay
 *   - the IndexedDB offline queue (pre-flight)
 *   - the SQL ↔ TS equivalence test in CI
 *
 * The reducer is pure: `apply(state, payload) -> nextState`. The validator is
 * side-effect-free and takes ambient context separately so reducers stay
 * trivially deterministic.
 *
 * `immer` is used internally for ergonomic state updates; consumers see only
 * frozen plain objects.
 */

import { produce } from "immer";
import {
  type ContractorEventPayload,
  type ContractorEventOf,
  type RateSnapshot,
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

export type EntryApprovalState =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

/**
 * State is conceptually immutable — `applyContractorEvent` always returns a
 * new value via `immer.produce`, which freezes the result. We do NOT add
 * `readonly` modifiers to the fields because immer's `Draft<T>` typing
 * conflicts with deep-readonly types; immutability is enforced at the
 * runtime level instead.
 */
export interface EntryState {
  entryId: string;
  contractorId: number;
  clientId: number;
  workspaceId: number;
  projectId: number;
  taskId: string | null;
  taskVersion: number | null;
  activityId: string | null;
  activityVersion: number | null;
  startedAt: string;
  stoppedAt: string | null;
  description: string | null;
  tags: string[];
  rate: RateSnapshot;
  isPlaceholder: boolean;
  approvalState: EntryApprovalState;
  interruptedEntryId: string | null;
  resumedFromEntryId: string | null;
  deletedAt: string | null;
  /**
   * If this entry was created via Split / Merge / TmetricImport, the source
   * lineage is recorded so projections can show provenance.
   */
  lineage: Array<{
    kind: "split" | "merge" | "tmetric_import";
    sourceEntryIds: string[];
    extra?: Record<string, unknown>;
  }>;
}

export interface ContractorStreamState {
  /** `null` until the first event is applied. */
  contractorId: number | null;
  entries: Record<string, EntryState>;
  /** TMetric ids already absorbed, for dedup. */
  importedTmetricIds: Record<string, true>;
}

export const emptyContractorStreamState: ContractorStreamState = Object.freeze({
  contractorId: null,
  entries: Object.freeze({}),
  importedTmetricIds: Object.freeze({}),
});

// ---------------------------------------------------------------------------
// Validator context — additional cross-stream facts the validator needs
// ---------------------------------------------------------------------------

export interface ContractorValidationContext extends AggregateContext {
  /**
   * Returns `true` if the (projectId, contractorId, occurredAt) tuple falls
   * inside an active period lock. Defaults to "never locked" — frontend
   * optimistic UI may pass undefined; the Worker will pass a real lookup
   * built from the project stream projection.
   */
  isLockedAt?: (input: {
    projectId: number;
    contractorId: number;
    occurredAt: string;
  }) => boolean;

  /**
   * Returns the current `(taskId | activityId | rateAggregateId)` version,
   * so the validator can warn if the client snapshotted a stale version.
   * Optional: returning `undefined` skips the check.
   */
  resolveCurrentTaskVersion?: (taskId: string) => number | undefined;
  resolveCurrentActivityVersion?: (activityId: string) => number | undefined;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RUNNING = Symbol("running"); // marker for clarity in code below
void RUNNING;

function getEntry(
  state: ContractorStreamState,
  entryId: string,
): EntryState | undefined {
  return state.entries[entryId];
}

function isRunning(entry: EntryState): boolean {
  return entry.stoppedAt === null && entry.deletedAt === null;
}

/**
 * A contractor is allowed AT MOST ONE running entry at a time — no
 * "primary + jump-on in parallel" lanes. The `interruptedEntryId` field
 * on a running entry is therefore a pure lineage pointer (a jump-on
 * remembers *where it came from* so the UI can offer "come back"), not
 * a signal that two entries are live together.
 *
 * This invariant is enforced both here (in `validateContractorEvent`)
 * and in SQL (partial unique index on `entry(contractor_id) WHERE
 * stopped_at IS NULL AND deleted_at IS NULL`) — belt + suspenders.
 */
function findRunningEntry(
  state: ContractorStreamState,
): EntryState | undefined {
  for (const entry of Object.values(state.entries)) {
    if (isRunning(entry)) return entry;
  }
  return undefined;
}

function err(
  code: ValidationError["code"],
  message: string,
  details?: Record<string, unknown>,
): ValidationError {
  return { code, message, details };
}

const isMutationAllowedFromApprovalState = (
  state: EntryApprovalState,
): boolean => state === "draft" || state === "rejected";

function rateAttributesEqual(a: RateSnapshot, b: RateSnapshot): boolean {
  return (
    a.unit === b.unit &&
    a.unitPrice === b.unitPrice &&
    a.currency === b.currency &&
    a.billingUnitPrice === b.billingUnitPrice &&
    a.billingCurrency === b.billingCurrency &&
    a.exchangeRate === b.exchangeRate
  );
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

/**
 * Apply one event to the state. Pure: input state is never mutated.
 *
 * Throws (programmer error) only if the event is structurally impossible to
 * project (e.g. stop on a missing entry). Validation must run *before* this.
 */
export function applyContractorEvent(
  state: ContractorStreamState,
  payload: ContractorEventPayload,
  meta: {
    /** ISO timestamp the event was authoritatively stamped at. */
    occurredAt: string;
    /** Contractor whose stream this is. */
    contractorId: number;
  },
): ContractorStreamState {
  return produce(state, (draft) => {
    if (draft.contractorId === null) {
      draft.contractorId = meta.contractorId;
    }

    switch (payload.type) {
      case "EntryStarted": {
        draft.entries[payload.entryId] = {
          entryId: payload.entryId,
          contractorId: meta.contractorId,
          clientId: payload.clientId,
          workspaceId: payload.workspaceId,
          projectId: payload.projectId,
          taskId: payload.task?.taskId ?? null,
          taskVersion: payload.task?.taskVersion ?? null,
          activityId: payload.activity?.activityId ?? null,
          activityVersion: payload.activity?.activityVersion ?? null,
          startedAt: payload.startedAt,
          stoppedAt: null,
          description: payload.description ?? null,
          tags: payload.tags ?? [],
          rate: payload.rate,
          isPlaceholder: payload.isPlaceholder,
          approvalState: "draft",
          interruptedEntryId: payload.interruptedEntryId ?? null,
          resumedFromEntryId: payload.resumedFromEntryId ?? null,
          deletedAt: null,
          lineage: [],
        };
        return;
      }

      case "EntryStopped": {
        const e = draft.entries[payload.entryId];
        if (!e) throw new Error(`apply(EntryStopped): unknown ${payload.entryId}`);
        e.stoppedAt = payload.stoppedAt;
        return;
      }

      case "EntryDescriptionChanged": {
        const e = draft.entries[payload.entryId];
        if (!e) throw new Error(`apply: unknown ${payload.entryId}`);
        e.description = payload.description;
        return;
      }

      case "EntryTaskAssigned": {
        const e = draft.entries[payload.entryId];
        if (!e) throw new Error(`apply: unknown ${payload.entryId}`);
        e.taskId = payload.task.taskId;
        e.taskVersion = payload.task.taskVersion;
        e.activityId = payload.activity.activityId;
        e.activityVersion = payload.activity.activityVersion;
        // Once both task and activity are present the entry is no longer a
        // placeholder.
        e.isPlaceholder = false;
        return;
      }

      case "EntryActivityAssigned": {
        const e = draft.entries[payload.entryId];
        if (!e) throw new Error(`apply: unknown ${payload.entryId}`);
        e.activityId = payload.activity.activityId;
        e.activityVersion = payload.activity.activityVersion;
        if (e.taskId !== null) e.isPlaceholder = false;
        return;
      }

      case "EntryRoutingChanged": {
        const e = draft.entries[payload.entryId];
        if (!e) throw new Error(`apply: unknown ${payload.entryId}`);
        e.clientId = payload.clientId;
        e.workspaceId = payload.workspaceId;
        e.projectId = payload.projectId;
        return;
      }

      case "EntryDeleted": {
        const e = draft.entries[payload.entryId];
        if (!e) throw new Error(`apply: unknown ${payload.entryId}`);
        e.deletedAt = meta.occurredAt;
        return;
      }

      case "EntrySplit": {
        const src = draft.entries[payload.sourceEntryId];
        if (!src) throw new Error(`apply: unknown ${payload.sourceEntryId}`);
        if (src.stoppedAt === null)
          throw new Error("apply(EntrySplit): source must be stopped");
        // Mark source as deleted (its lineage now lives in the children).
        src.deletedAt = meta.occurredAt;

        const splitMs = Date.parse(payload.splitAt);
        const gapMs = payload.gapSeconds * 1000;

        const left: EntryState = {
          ...src,
          entryId: payload.leftEntryId,
          stoppedAt: payload.splitAt,
          approvalState: "draft",
          deletedAt: null,
          lineage: [
            {
              kind: "split",
              sourceEntryIds: [payload.sourceEntryId],
              extra: { side: "left", gapSeconds: payload.gapSeconds },
            },
          ],
        };
        const rightStartedAt = new Date(splitMs + gapMs).toISOString();
        const right: EntryState = {
          ...src,
          entryId: payload.rightEntryId,
          startedAt: rightStartedAt,
          approvalState: "draft",
          deletedAt: null,
          lineage: [
            {
              kind: "split",
              sourceEntryIds: [payload.sourceEntryId],
              extra: { side: "right", gapSeconds: payload.gapSeconds },
            },
          ],
        };
        draft.entries[left.entryId] = left;
        draft.entries[right.entryId] = right;
        return;
      }

      case "EntryMerged": {
        const a = draft.entries[payload.leftEntryId];
        const b = draft.entries[payload.rightEntryId];
        if (!a || !b) throw new Error("apply(EntryMerged): unknown side");
        a.deletedAt = meta.occurredAt;
        b.deletedAt = meta.occurredAt;
        // Use a's identity for everything except start/stop, which span both.
        const startedAt =
          Date.parse(a.startedAt) <= Date.parse(b.startedAt)
            ? a.startedAt
            : b.startedAt;
        const stoppedAt = (() => {
          const aStop = a.stoppedAt;
          const bStop = b.stoppedAt;
          if (aStop === null || bStop === null) return null;
          return Date.parse(aStop) >= Date.parse(bStop) ? aStop : bStop;
        })();
        draft.entries[payload.mergedEntryId] = {
          ...a,
          entryId: payload.mergedEntryId,
          startedAt,
          stoppedAt,
          approvalState: "draft",
          deletedAt: null,
          lineage: [
            {
              kind: "merge",
              sourceEntryIds: [payload.leftEntryId, payload.rightEntryId],
            },
          ],
        };
        return;
      }

      case "EntryRateSnapshotted": {
        const e = draft.entries[payload.entryId];
        if (!e) throw new Error(`apply: unknown ${payload.entryId}`);
        e.rate = payload.rate;
        return;
      }

      case "EntryTagsChanged": {
        const e = draft.entries[payload.entryId];
        if (!e) throw new Error(`apply: unknown ${payload.entryId}`);
        e.tags = payload.tags;
        return;
      }

      case "TimeSubmittedForApproval": {
        for (const id of payload.entryIds) {
          const e = draft.entries[id];
          if (e) e.approvalState = "submitted";
        }
        return;
      }
      case "TimeApproved": {
        for (const id of payload.entryIds) {
          const e = draft.entries[id];
          if (e) e.approvalState = "approved";
        }
        return;
      }
      case "TimeRejected": {
        for (const id of payload.entryIds) {
          const e = draft.entries[id];
          if (e) e.approvalState = "rejected";
        }
        return;
      }
      case "EntryRevertedToDraft": {
        const e = draft.entries[payload.entryId];
        if (e) e.approvalState = "draft";
        return;
      }

      case "EntryImportedFromTmetric": {
        draft.importedTmetricIds[payload.tmetricEntryId] = true;
        draft.entries[payload.entryId] = {
          entryId: payload.entryId,
          contractorId: meta.contractorId,
          clientId: payload.clientId,
          workspaceId: payload.workspaceId,
          projectId: payload.projectId,
          taskId: payload.task?.taskId ?? null,
          taskVersion: payload.task?.taskVersion ?? null,
          activityId: payload.activity?.activityId ?? null,
          activityVersion: payload.activity?.activityVersion ?? null,
          startedAt: payload.startedAt,
          stoppedAt: payload.stoppedAt,
          description: payload.description ?? null,
          tags: payload.tags ?? [],
          rate: payload.rate,
          isPlaceholder: payload.isPlaceholder,
          approvalState: "draft",
          interruptedEntryId: null,
          resumedFromEntryId: null,
          deletedAt: null,
          lineage: [
            {
              kind: "tmetric_import",
              sourceEntryIds: [],
              extra: { tmetricEntryId: payload.tmetricEntryId },
            },
          ],
        };
        return;
      }

      default:
        return unreachable(payload);
    }
  });
}

/**
 * Fold an entire stream from scratch. Useful for replays / equivalence tests.
 */
export function replayContractorStream(
  contractorId: number,
  events: ReadonlyArray<{
    payload: ContractorEventPayload;
    occurredAt: string;
  }>,
): ContractorStreamState {
  let state = emptyContractorStreamState;
  for (const e of events) {
    state = applyContractorEvent(state, e.payload, {
      contractorId,
      occurredAt: e.occurredAt,
    });
  }
  return state;
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/**
 * Decide whether `payload` may be appended to `state` for `contractorId`.
 * Schema-level checks are assumed to have already passed (call
 * `contractorEventPayloadSchema.parse` first).
 */
export function validateContractorEvent(
  state: ContractorStreamState,
  payload: ContractorEventPayload,
  ctx: ContractorValidationContext,
): ValidationResult {
  // Stream-identity / actor-vs-contractor authorisation is the Worker's
  // responsibility — it maps `ctx.actorUserId` to a contractorId and confirms
  // they own this stream before calling us. The validator here is concerned
  // only with intra-stream invariants.

  switch (payload.type) {
    case "EntryStarted": {
      const errors: ValidationError[] = [];
      if (state.entries[payload.entryId]) {
        errors.push(
          err(
            "entry.already_exists",
            `entry ${payload.entryId} already exists`,
            { entryId: payload.entryId },
          ),
        );
      }
      if (
        ctx.isLockedAt?.({
          projectId: payload.projectId,
          contractorId: state.contractorId ?? -1,
          occurredAt: payload.startedAt,
        })
      ) {
        errors.push(
          err(
            "entry.locked_by_period",
            "cannot start an entry inside a locked period",
            { projectId: payload.projectId, occurredAt: payload.startedAt },
          ),
        );
      }
      // Single-running-entry policy: any non-stopped, non-deleted entry
      // blocks a new start. Jump-on is no longer a parallel lane — the
      // client is expected to send `EntryStopped(prior)` immediately
      // before this event (same correlationId) so replay sees the
      // two-event pivot as one gesture.
      const running = findRunningEntry(state);
      if (running) {
        errors.push(
          err(
            "entry.concurrent_timer",
            "another timer is already running; stop it before starting a new one",
            { runningEntryId: running.entryId },
          ),
        );
      }
      // `interruptedEntryId` is now a pure lineage pointer ("where the
      // user came from"), so the only thing we validate is that the
      // referenced entry actually exists in the stream. It should be
      // stopped by the time we see this event — but we don't enforce
      // that here to keep the replay order-forgiving; the partial
      // unique index in SQL is the hard guarantee.
      if (payload.interruptedEntryId !== undefined) {
        const interrupted = state.entries[payload.interruptedEntryId];
        if (!interrupted) {
          errors.push(
            err(
              "entry.not_found",
              `interruptedEntryId ${payload.interruptedEntryId} not found`,
            ),
          );
        }
      }
      return errors.length ? fail(...errors) : ok();
    }

    case "EntryStopped": {
      const e = getEntry(state, payload.entryId);
      if (!e) return fail(err("entry.not_found", "entry not found"));
      if (e.deletedAt !== null)
        return fail(err("entry.deleted", "entry is deleted"));
      if (e.stoppedAt !== null)
        return fail(err("entry.already_stopped", "entry already stopped"));
      if (Date.parse(payload.stoppedAt) < Date.parse(e.startedAt))
        return fail(
          err(
            "entry.stopped_before_started",
            "stoppedAt must be ≥ startedAt",
            { startedAt: e.startedAt, stoppedAt: payload.stoppedAt },
          ),
        );
      if (
        ctx.isLockedAt?.({
          projectId: e.projectId,
          contractorId: state.contractorId ?? -1,
          occurredAt: payload.stoppedAt,
        })
      ) {
        return fail(
          err("entry.locked_by_period", "cannot stop inside a locked period"),
        );
      }
      return ok();
    }

    case "EntryDescriptionChanged":
    case "EntryTaskAssigned":
    case "EntryActivityAssigned":
    case "EntryRoutingChanged":
    case "EntryRateSnapshotted":
    case "EntryTagsChanged": {
      const e = getEntry(state, payload.entryId);
      if (!e) return fail(err("entry.not_found", "entry not found"));
      if (e.deletedAt !== null)
        return fail(err("entry.deleted", "entry is deleted"));
      if (!isMutationAllowedFromApprovalState(e.approvalState))
        return fail(
          err(
            "entry.locked_by_approval_state",
            "revert to draft before editing",
            { approvalState: e.approvalState },
          ),
        );
      return ok();
    }

    case "EntryDeleted": {
      const e = getEntry(state, payload.entryId);
      if (!e) return fail(err("entry.not_found", "entry not found"));
      if (e.deletedAt !== null)
        return fail(err("entry.deleted", "entry already deleted"));
      if (!isMutationAllowedFromApprovalState(e.approvalState))
        return fail(
          err(
            "entry.locked_by_approval_state",
            "revert to draft before deleting",
            { approvalState: e.approvalState },
          ),
        );
      return ok();
    }

    case "EntrySplit": {
      const errors: ValidationError[] = [];
      const src = getEntry(state, payload.sourceEntryId);
      if (!src) return fail(err("entry.not_found", "source entry not found"));
      if (src.deletedAt !== null)
        return fail(err("entry.deleted", "source already deleted"));
      if (src.stoppedAt === null)
        return fail(
          err("entry.not_stopped", "cannot split a running entry"),
        );
      if (!isMutationAllowedFromApprovalState(src.approvalState))
        return fail(
          err(
            "entry.locked_by_approval_state",
            "revert to draft before splitting",
          ),
        );
      const startMs = Date.parse(src.startedAt);
      const stopMs = Date.parse(src.stoppedAt);
      const splitMs = Date.parse(payload.splitAt);
      if (splitMs <= startMs || splitMs >= stopMs) {
        errors.push(
          err(
            "entry.split_out_of_range",
            "splitAt must be strictly inside (startedAt, stoppedAt)",
          ),
        );
      }
      const gapMs = payload.gapSeconds * 1000;
      if (splitMs + gapMs > stopMs) {
        errors.push(
          err(
            "entry.split_gap_too_large",
            "splitAt + gapSeconds must not exceed stoppedAt",
          ),
        );
      }
      if (state.entries[payload.leftEntryId])
        errors.push(
          err("entry.already_exists", "leftEntryId already exists", {
            entryId: payload.leftEntryId,
          }),
        );
      if (state.entries[payload.rightEntryId])
        errors.push(
          err("entry.already_exists", "rightEntryId already exists", {
            entryId: payload.rightEntryId,
          }),
        );
      return errors.length ? fail(...errors) : ok();
    }

    case "EntryMerged": {
      const errors: ValidationError[] = [];
      const a = getEntry(state, payload.leftEntryId);
      const b = getEntry(state, payload.rightEntryId);
      if (!a || !b)
        return fail(err("entry.not_found", "merge side(s) not found"));
      if (a.deletedAt !== null || b.deletedAt !== null)
        return fail(err("entry.deleted", "merge side(s) deleted"));
      if (a.stoppedAt === null || b.stoppedAt === null)
        return fail(err("entry.not_stopped", "both sides must be stopped"));
      if (
        !isMutationAllowedFromApprovalState(a.approvalState) ||
        !isMutationAllowedFromApprovalState(b.approvalState)
      ) {
        return fail(
          err(
            "entry.locked_by_approval_state",
            "revert both sides to draft before merging",
          ),
        );
      }
      const [left, right] =
        Date.parse(a.startedAt) <= Date.parse(b.startedAt) ? [a, b] : [b, a];
      const adjacentMs = Date.parse(right.startedAt) - Date.parse(left.stoppedAt!);
      if (adjacentMs < 0) {
        errors.push(
          err(
            "entry.merge_not_adjacent",
            "merge sides overlap in time",
          ),
        );
      }
      // Require structurally identical key attributes.
      if (
        a.clientId !== b.clientId ||
        a.workspaceId !== b.workspaceId ||
        a.projectId !== b.projectId ||
        a.taskId !== b.taskId ||
        a.activityId !== b.activityId ||
        !rateAttributesEqual(a.rate, b.rate)
      ) {
        errors.push(
          err(
            "entry.merge_mismatched_attributes",
            "merge sides must share project/client/workspace/task/activity/rate",
          ),
        );
      }
      if (state.entries[payload.mergedEntryId])
        errors.push(
          err("entry.already_exists", "mergedEntryId already exists", {
            entryId: payload.mergedEntryId,
          }),
        );
      return errors.length ? fail(...errors) : ok();
    }

    case "TimeSubmittedForApproval": {
      const errors: ValidationError[] = [];
      for (const id of payload.entryIds) {
        const e = getEntry(state, id);
        if (!e) {
          errors.push(
            err("entry.not_found", `entry ${id} not found`, { entryId: id }),
          );
          continue;
        }
        if (e.deletedAt !== null) {
          errors.push(
            err("entry.deleted", `entry ${id} is deleted`, { entryId: id }),
          );
          continue;
        }
        if (e.stoppedAt === null) {
          errors.push(
            err("approval.entry_running", `entry ${id} is still running`, {
              entryId: id,
            }),
          );
          continue;
        }
        if (e.approvalState !== "draft" && e.approvalState !== "rejected") {
          errors.push(
            err(
              "approval.entry_not_in_state",
              `entry ${id} is not in draft/rejected (got ${e.approvalState})`,
              { entryId: id, approvalState: e.approvalState },
            ),
          );
        }
        // Placeholder entries are "needs detail" — task / activity must be
        // filled in before they can be reviewed. Blocking here keeps the
        // downstream approval queue, exports, and billing reports from
        // ever seeing half-formed rows.
        if (e.isPlaceholder) {
          errors.push(
            err(
              "approval.entry_is_placeholder",
              `entry ${id} is a placeholder — fill in task and activity before submitting`,
              { entryId: id },
            ),
          );
        }
      }
      return errors.length ? fail(...errors) : ok();
    }

    case "TimeApproved":
    case "TimeRejected": {
      const expected: EntryApprovalState = "submitted";
      const errors: ValidationError[] = [];
      for (const id of payload.entryIds) {
        const e = getEntry(state, id);
        if (!e) {
          errors.push(
            err("entry.not_found", `entry ${id} not found`, { entryId: id }),
          );
          continue;
        }
        if (e.approvalState !== expected) {
          errors.push(
            err(
              "approval.entry_not_in_state",
              `entry ${id} is not in ${expected} (got ${e.approvalState})`,
              { entryId: id, approvalState: e.approvalState },
            ),
          );
        }
      }
      return errors.length ? fail(...errors) : ok();
    }

    case "EntryRevertedToDraft": {
      const e = getEntry(state, payload.entryId);
      if (!e) return fail(err("entry.not_found", "entry not found"));
      if (e.approvalState === "draft")
        return fail(
          err(
            "approval.entry_not_in_state",
            "entry is already draft",
            { approvalState: e.approvalState },
          ),
        );
      return ok();
    }

    case "EntryImportedFromTmetric": {
      const errors: ValidationError[] = [];
      if (state.importedTmetricIds[payload.tmetricEntryId]) {
        errors.push(
          err(
            "entry.tmetric_id_already_imported",
            "this TMetric entry has already been imported",
            { tmetricEntryId: payload.tmetricEntryId },
          ),
        );
      }
      if (state.entries[payload.entryId]) {
        errors.push(
          err("entry.already_exists", "entry id already exists", {
            entryId: payload.entryId,
          }),
        );
      }
      return errors.length ? fail(...errors) : ok();
    }

    default:
      return unreachable(payload);
  }
}

// Re-export concrete event-type helper for IDE jump-to.
export type { ContractorEventOf };
