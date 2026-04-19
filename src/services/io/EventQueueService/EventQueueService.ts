import type {
  ContractorEventEnvelope,
  ContractorEventPayload,
  ProjectEventEnvelope,
  ProjectEventPayload,
} from "@/api/time-event/time-event.api";
import type {
  ContractorStreamState,
  ProjectStreamState,
  ValidationError,
} from "@/api/time-event/aggregates";
import type {
  QueuedEvent,
  QueuedEventStats,
} from "@/api/time-event-queue/queued-event.api";
import type { SimpleStoreReadOnly } from "@passionware/simple-store";

/**
 * Reactive state surfaced by {@link EventQueueService} for the UI's
 * "pending sync" pip + drawer.
 */
export interface EventQueueState {
  events: QueuedEvent[];
  stats: QueuedEventStats;
  /**
   * `true` while the flush loop is mid-attempt. The TrackerBar uses this to
   * pulse the sync pip; it does NOT imply pending events (the loop may run
   * after the last delivery succeeded just to retry-clear failed rows).
   */
  isFlushing: boolean;
  /**
   * `false` when the queue believes the network is unreachable (last
   * attempt yielded a transient failure and the retry hasn't fired yet).
   */
  isOnline: boolean;
  /** Wall-clock of the last completed flush attempt. */
  lastFlushAt: Date | null;
}

/**
 * Outcome of `submitContractorEvent` / `submitProjectEvent`.
 *
 *   `accepted_locally` → pre-flight validation passed and the event is now
 *                        durably queued. The worker hasn't seen it yet; the
 *                        caller can apply the optimistic overlay immediately.
 *   `rejected_locally` → pre-flight validation rejected the command. NOT
 *                        queued. UI should surface the errors to the user.
 *   `duplicate`        → the same `clientEventId` was already queued. Returns
 *                        the existing row (idempotent retries).
 */
export type SubmitOutcome =
  | { kind: "accepted_locally"; queued: QueuedEvent }
  | { kind: "rejected_locally"; errors: ValidationError[] }
  | { kind: "duplicate"; queued: QueuedEvent };

/**
 * Caller-supplied context for pre-flight validation. Passing the snapshot
 * is optional — when omitted we validate against the queued tail only,
 * which catches obvious local conflicts (e.g. starting a 2nd timer) but
 * cannot catch server-state conflicts. Callers that already render
 * projection data (e.g. TrackerBar) should pass a derived snapshot for the
 * tightest UX.
 */
export interface SubmitContractorCtx {
  /**
   * Latest known server state for this contractor's stream. The service
   * folds queued events on top of this before validating.
   */
  serverSnapshot?: ContractorStreamState | null;
  /**
   * `(input) => boolean` returning whether a given `(projectId, contractorId,
   * occurredAt)` is locked by a closed period. Optional — when omitted the
   * validator behaves as if no period is locked (the worker will reject if
   * actually locked).
   */
  isLockedAt?: (input: {
    projectId: number;
    contractorId: number;
    occurredAt: string;
  }) => boolean;
}

export interface SubmitProjectCtx {
  serverSnapshot?: ProjectStreamState | null;
}

/**
 * Aggregate, persisted, and reactive event queue. Owns:
 *   - durable per-stream FIFO storage (IDB in the browser)
 *   - shared-validator pre-flight before durably enqueueing
 *   - the flush loop that POSTs to the worker, with backoff + reconciliation
 *   - lifecycle bookkeeping that the UI's pending panel renders
 */
export interface EventQueueService {
  /** Reactive snapshot for `useSimpleStore`. */
  readonly state: SimpleStoreReadOnly<EventQueueState>;

  submitContractorEvent: (
    envelope: ContractorEventEnvelope,
    payload: ContractorEventPayload,
    ctx?: SubmitContractorCtx,
  ) => Promise<SubmitOutcome>;

  submitProjectEvent: (
    envelope: ProjectEventEnvelope,
    payload: ProjectEventPayload,
    ctx?: SubmitProjectCtx,
  ) => Promise<SubmitOutcome>;

  /**
   * Force a flush attempt now (e.g. user clicked "retry" in the pending
   * panel, or `online` event fired). Resolves once the current pass
   * finishes; subsequent calls coalesce into a single in-flight pass.
   */
  flushNow: () => Promise<void>;

  /**
   * Drop a delivered or failed-validation row from the queue. Pending /
   * in-flight rows are protected (the user must let them finish first).
   */
  drop: (seq: number) => Promise<void>;

  /**
   * For a given contractor stream, return the ordered list of queued
   * events (pending + in-flight) so callers can fold them onto a server
   * snapshot to compute an optimistic projection. Cheap; reads from the
   * in-memory mirror, not IDB.
   */
  pendingForContractor: (contractorId: number) => QueuedEvent[];

  /** Same, for a given project stream. */
  pendingForProject: (projectId: number) => QueuedEvent[];
}

export interface WithEventQueueService {
  eventQueueService: EventQueueService;
}
