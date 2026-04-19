import type {
  ContractorEventEnvelope,
  ContractorEventPayload,
  ProjectEventEnvelope,
  ProjectEventPayload,
} from "@/api/time-event/time-event.api";
import type { ValidationError } from "@/api/time-event/aggregates";
import { Nullable } from "@/platform/typescript/Nullable";

/**
 * Lifecycle state of a queued event:
 *
 *   pending          → enqueued, waiting for the flush loop to pick it up
 *   in_flight        → currently POST-ing to the worker
 *   delivered        → worker accepted (or recognised as a duplicate); the
 *                      `confirmedSeq` is set and the row will be cleaned up
 *                      after a short retention window (kept around briefly so
 *                      the UI can show the "saved ✓" pip)
 *   failed_validation→ worker rejected with a domain error; needs user
 *                      attention (the entry may now be inconsistent with
 *                      server state — we surface this in the pending panel)
 *   failed_transient → network / 5xx — queued for retry with backoff
 *
 * The queue is FIFO per stream key (`contractor:N` or
 * `project:N`). One in-flight event per stream key at any time, so the worker
 * sees events in the order the user produced them.
 */
export type QueuedEventStatus =
  | "pending"
  | "in_flight"
  | "delivered"
  | "failed_validation"
  | "failed_transient";

/** Discriminator on the event stream — matches the worker's body schema. */
export type QueuedEventStreamKind = "contractor" | "project";

/**
 * Stream key used by the queue to enforce per-stream FIFO ordering.
 * `contractor:42` and `project:7` are independent keys.
 */
export type QueuedStreamKey = `contractor:${number}` | `project:${number}`;

/**
 * One row in the offline queue. Persisted to IndexedDB in the browser; held
 * in memory in tests / SSR.
 *
 * Identity: the queue's own auto-incrementing `seq` is the FIFO order, but
 * the canonical idempotency key against the worker is the embedded
 * `envelope.clientEventId` — submitting the same `clientEventId` twice MUST
 * be safe (the worker dedupes).
 */
export interface QueuedEvent {
  /** Monotonic per-process FIFO position. The IDB store assigns this. */
  seq: number;
  streamKind: QueuedEventStreamKind;
  /** Composite key used to serialize per-stream submissions. */
  streamKey: QueuedStreamKey;
  envelope: ContractorEventEnvelope | ProjectEventEnvelope;
  payload: ContractorEventPayload | ProjectEventPayload;
  status: QueuedEventStatus;
  /** When the user/UI submitted this. */
  enqueuedAt: Date;
  attempts: number;
  lastAttemptAt: Nullable<Date>;
  /** Server's assigned sequence number once the worker confirms. */
  confirmedSeq: Nullable<number>;
  lastError: Nullable<{
    /** "transient" → network / 5xx; "validation" → domain reject from worker. */
    kind: "transient" | "validation" | "schema";
    message: string;
    /** Set when the worker returned validation errors from the shared validator. */
    validationErrors?: ValidationError[];
  }>;
}

/** Aggregate counts the UI surfaces in the "pending sync" pip. */
export interface QueuedEventStats {
  pending: number;
  inFlight: number;
  failed: number;
  delivered: number;
  total: number;
}

export function emptyQueuedEventStats(): QueuedEventStats {
  return { pending: 0, inFlight: 0, failed: 0, delivered: 0, total: 0 };
}

export function deriveQueueStats(events: readonly QueuedEvent[]): QueuedEventStats {
  const stats = emptyQueuedEventStats();
  for (const e of events) {
    stats.total++;
    if (e.status === "pending") stats.pending++;
    else if (e.status === "in_flight") stats.inFlight++;
    else if (e.status === "delivered") stats.delivered++;
    else stats.failed++;
  }
  return stats;
}

/**
 * Build the FIFO key for a given stream + numeric id. Centralised so both
 * the queue and the in-memory tests stay in lockstep.
 */
export function streamKeyForContractor(
  contractorId: number,
): QueuedStreamKey {
  return `contractor:${contractorId}`;
}

export function streamKeyForProject(projectId: number): QueuedStreamKey {
  return `project:${projectId}`;
}

export function streamKeyOf(event: QueuedEvent): QueuedStreamKey {
  return event.streamKey;
}
