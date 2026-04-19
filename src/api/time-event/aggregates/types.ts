/**
 * Shared result / error types for aggregate command validators.
 *
 * The Worker, the offline queue, and the optimistic UI overlay all import
 * these. Pure-TS, no runtime dependencies.
 */

/**
 * Stable, machine-readable code for every kind of validation failure. Worker
 * surfaces this back to the client so the UI can localise messages and the
 * offline queue can decide whether to retry.
 *
 * Naming convention: `<aggregate>.<violation>`. New codes are append-only;
 * never repurpose an existing code.
 */
export type ValidationCode =
  // ── envelope-level ────────────────────────────────────────────────────────
  | "envelope.malformed"
  | "envelope.duplicate_client_event_id"
  | "envelope.unknown_event_type"
  | "envelope.future_timestamp"
  | "envelope.optimistic_concurrency"
  // ── entry sub-aggregate (contractor stream) ───────────────────────────────
  | "entry.not_found"
  | "entry.already_exists"
  | "entry.already_stopped"
  | "entry.not_stopped"
  | "entry.stopped_before_started"
  | "entry.deleted"
  | "entry.locked_by_period"
  | "entry.locked_by_approval_state"
  | "entry.concurrent_timer"
  | "entry.split_out_of_range"
  | "entry.split_gap_too_large"
  | "entry.merge_not_adjacent"
  | "entry.merge_mismatched_attributes"
  | "entry.tmetric_id_already_imported"
  | "entry.placeholder_required_fields"
  // ── approval workflow ─────────────────────────────────────────────────────
  | "approval.entry_not_in_state"
  | "approval.entry_running"
  | "approval.entry_belongs_to_other_contractor"
  // ── project stream / task ─────────────────────────────────────────────────
  | "task.not_found"
  | "task.already_exists"
  | "task.already_completed"
  | "task.not_completed"
  | "task.already_archived"
  | "task.not_archived"
  | "task.assignee_already_present"
  | "task.assignee_not_present"
  | "task.external_link_already_present"
  | "task.external_link_not_present"
  // ── project stream / activity ─────────────────────────────────────────────
  | "activity.not_found"
  | "activity.already_exists"
  | "activity.already_archived"
  | "activity.not_archived"
  // ── project stream / rate ─────────────────────────────────────────────────
  | "rate.not_found"
  | "rate.already_exists"
  | "rate.effective_from_not_after_current"
  | "rate.contractor_mismatch"
  // ── project stream / period_lock ──────────────────────────────────────────
  | "lock.not_found"
  | "lock.already_unlocked"
  | "lock.already_exists";

export interface ValidationError {
  code: ValidationCode;
  /** Human-friendly message — UI may localise. */
  message: string;
  /** Optional structured payload for richer UI (e.g. conflicting entryId). */
  details?: Record<string, unknown>;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: ValidationError[] };

export const ok = (): ValidationResult => ({ ok: true });
export const fail = (...errors: ValidationError[]): ValidationResult => ({
  ok: false,
  errors,
});

/**
 * Ambient context passed to validators when the answer depends on facts the
 * stream itself doesn't know — typically the actor's identity (the Worker
 * sets this from the verified Supabase JWT) and "now" used for clamping
 * future timestamps.
 *
 * The reducer (which only computes state, never decides) does not take this.
 */
export interface AggregateContext {
  /** UUID of the authenticated user submitting the command. */
  actorUserId: string;
  /** Wall-clock "now" the validator may use to reject future-dated events. */
  now: Date;
  /**
   * Maximum tolerated forward drift in ms. Events whose `occurredAt` is more
   * than this in the future are rejected. Defaults vary per call site; pass
   * 0 to require strictly-past timestamps.
   */
  maxFutureDriftMs?: number;
}

/**
 * Helper for reducers / validators: assert exhaustiveness in `switch (type)`.
 * Compiles only when every case is handled.
 */
export function unreachable(value: never): never {
  throw new Error(
    `unreachable: unhandled discriminant ${JSON.stringify(value)}`,
  );
}
