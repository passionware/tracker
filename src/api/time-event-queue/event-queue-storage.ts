import type { QueuedEvent } from "@/api/time-event-queue/queued-event.api";

/**
 * Storage backend for the offline event queue.
 *
 * The browser uses {@link IndexedDbEventQueueStorage} for durability across
 * page loads / crashes. Tests and SSR use {@link InMemoryEventQueueStorage}.
 *
 * All methods are async because IDB is async; the in-memory implementation
 * matches the contract by returning resolved promises.
 *
 * The store is *append-only at the row level* (we never UPDATE an event's
 * payload), but we do mutate the lifecycle metadata (`status`, `attempts`,
 * `lastError`, `confirmedSeq`) — the audit trail of those transitions lives
 * in worker-side `contractor_event` / `project_event` rows, not here.
 */
export interface EventQueueStorage {
  /**
   * Enqueue a new event. Storage assigns a monotonic `seq` and returns the
   * fully-populated row. Submission MUST be idempotent on
   * `envelope.clientEventId` — re-enqueueing the same client event id is a
   * no-op and returns the previously-stored row instead.
   */
  enqueue: (
    input: Omit<QueuedEvent, "seq">,
  ) => Promise<QueuedEvent>;

  /** Return all rows in `seq` ascending order (the FIFO order of arrival). */
  list: () => Promise<QueuedEvent[]>;

  /** Return rows whose `streamKey` matches and whose `status` is in `statuses`. */
  listByStream: (
    streamKey: QueuedEvent["streamKey"],
    statuses?: ReadonlyArray<QueuedEvent["status"]>,
  ) => Promise<QueuedEvent[]>;

  /** Replace the lifecycle metadata of one row. Throws if `seq` doesn't exist. */
  update: (
    seq: number,
    patch: Partial<
      Pick<
        QueuedEvent,
        | "status"
        | "attempts"
        | "lastAttemptAt"
        | "confirmedSeq"
        | "lastError"
      >
    >,
  ) => Promise<QueuedEvent>;

  /** Drop a row (used to garbage-collect delivered events after retention). */
  remove: (seq: number) => Promise<void>;

  /**
   * Find a previously-queued event by its `envelope.clientEventId`. Used to
   * dedupe at submit time so re-runs of the same UI gesture don't enqueue
   * twice.
   */
  findByClientEventId: (clientEventId: string) => Promise<QueuedEvent | null>;
}
