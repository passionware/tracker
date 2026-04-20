import type {
  ContractorEventEnvelope,
  ContractorEventPayload,
  ProjectEventEnvelope,
  ProjectEventPayload,
} from "@/api/time-event/time-event.api";
import {
  applyContractorEvent,
  applyProjectEvent,
  emptyContractorStreamState,
  emptyProjectStreamState,
  validateContractorEvent,
  validateProjectEvent,
  type ContractorStreamState,
  type ProjectStreamState,
  type ValidationError,
} from "@/api/time-event/aggregates";
import type { EventQueueStorage } from "@/api/time-event-queue/event-queue-storage";
import {
  deriveQueueStats,
  streamKeyForContractor,
  streamKeyForProject,
  type QueuedEvent,
  type QueuedStreamKey,
} from "@/api/time-event-queue/queued-event.api";
import type {
  TimeEventsWorkerClient,
  SubmitEventResult,
} from "@/api/time-event-queue/time-events-worker-client";
import type {
  EventQueueService,
  EventQueueState,
  SubmitContractorCtx,
  SubmitOutcome,
  SubmitProjectCtx,
} from "@/services/io/EventQueueService/EventQueueService";
import type { WithMessageService } from "@/services/internal/MessageService/MessageService";
import { WithServices } from "@/platform/typescript/services";
import { createSimpleStore } from "@passionware/simple-store";

const DEFAULT_DELIVERED_RETENTION_MS = 5_000;
const DEFAULT_BACKOFF_BASE_MS = 1_000;
const DEFAULT_BACKOFF_MAX_MS = 30_000;

export interface CreateEventQueueServiceDeps
  extends WithServices<[WithMessageService]> {
  storage: EventQueueStorage;
  workerClient: TimeEventsWorkerClient;
  /** Used by the worker validator. Defaults to authenticated user; for the
   *  pre-flight overlay we don't strictly need a real id (the worker is
   *  authoritative) but keep the signature stable for tests. */
  actorUserId: () => string;
  /** Defaults to `() => new Date()`. Tests override for determinism. */
  now?: () => Date;
  /** Defaults to native `setTimeout`. */
  setTimeout?: typeof setTimeout;
  /** Defaults to native `clearTimeout`. */
  clearTimeout?: typeof clearTimeout;
  /** Override delays for tests. */
  deliveredRetentionMs?: number;
  backoffBaseMs?: number;
  backoffMaxMs?: number;
}

/**
 * Reference implementation of {@link EventQueueService}.
 *
 * Concurrency model
 * -----------------
 * One in-flight POST per stream key (`contractor:N` / `project:N`) at a
 * time, so the worker sees events in the order the user produced them.
 * Different streams flush in parallel.
 *
 * Pre-flight validation
 * ---------------------
 * Before persisting, we replay queued events from the same stream on top
 * of the caller-supplied snapshot (or the empty state if none was given)
 * and run the matching shared validator. If validation fails the event is
 * NOT enqueued — the caller learns immediately and the offline queue stays
 * clean.
 *
 * Lifecycle transitions
 * ---------------------
 *   pending → in_flight → delivered (kept ~5s, then GC'd)
 *                       → failed_transient (re-queued with backoff)
 *                       → failed_validation (kept; user resolves manually)
 *
 * On every transition we publish a fresh state snapshot to the SimpleStore.
 *
 * Reconciliation with cached projection data
 * ------------------------------------------
 * On `delivered` we fire `messageService.reportSystemEffect` so the
 * existing TanStack Query caches in `TimeEntryService` /
 * `TaskDefinitionService` / etc. invalidate and refetch the new projection
 * row.
 */
export function createEventQueueService(
  deps: CreateEventQueueServiceDeps,
): EventQueueService {
  const now = deps.now ?? (() => new Date());
  const setTimeoutImpl = deps.setTimeout ?? setTimeout;
  const clearTimeoutImpl = deps.clearTimeout ?? clearTimeout;
  const deliveredRetentionMs =
    deps.deliveredRetentionMs ?? DEFAULT_DELIVERED_RETENTION_MS;
  const backoffBaseMs = deps.backoffBaseMs ?? DEFAULT_BACKOFF_BASE_MS;
  const backoffMaxMs = deps.backoffMaxMs ?? DEFAULT_BACKOFF_MAX_MS;

  const store = createSimpleStore<EventQueueState>({
    events: [],
    stats: { pending: 0, inFlight: 0, failed: 0, delivered: 0, total: 0 },
    isFlushing: false,
    isOnline: true,
    lastFlushAt: null,
  });

  /** In-memory mirror of storage, kept in sync after every mutation. */
  let mirror: QueuedEvent[] = [];

  /**
   * Per-stream-key serialisation. While a stream's promise is pending,
   * subsequent flush requests await the same promise. Different stream
   * keys flush in parallel.
   */
  const inFlightByStream = new Map<QueuedStreamKey, Promise<void>>();
  const backoffTimers = new Map<QueuedStreamKey, ReturnType<typeof setTimeout>>();
  const backoffAttemptsByStream = new Map<QueuedStreamKey, number>();

  void hydrate();

  async function hydrate(): Promise<void> {
    mirror = await deps.storage.list();
    // Anything that was in_flight when the tab died is now pending again —
    // the worker either accepted it (idempotency dedupes the retry) or it
    // never arrived.
    for (const row of mirror) {
      if (row.status === "in_flight") {
        const reset = await deps.storage.update(row.seq, {
          status: "pending",
        });
        replaceInMirror(reset);
      }
    }
    publish();
    void flushNow();
  }

  function replaceInMirror(row: QueuedEvent): void {
    const idx = mirror.findIndex((e) => e.seq === row.seq);
    if (idx >= 0) mirror[idx] = row;
    else mirror = [...mirror, row].sort((a, b) => a.seq - b.seq);
  }

  function removeFromMirror(seq: number): void {
    mirror = mirror.filter((e) => e.seq !== seq);
  }

  function publish(patch?: Partial<EventQueueState>): void {
    const events = [...mirror];
    store.setNewValue((prev) => ({
      ...prev,
      events,
      stats: deriveQueueStats(events),
      ...(patch ?? {}),
    }));
  }

  function pendingForKey(key: QueuedStreamKey): QueuedEvent[] {
    return mirror
      .filter(
        (e) =>
          e.streamKey === key &&
          (e.status === "pending" || e.status === "in_flight"),
      )
      .sort((a, b) => a.seq - b.seq);
  }

  function foldContractorPending(
    base: ContractorStreamState | null | undefined,
    key: QueuedStreamKey,
  ): ContractorStreamState {
    let state = base ?? emptyContractorStreamState;
    for (const row of pendingForKey(key)) {
      if (row.streamKind !== "contractor") continue;
      const env = row.envelope as ContractorEventEnvelope;
      try {
        state = applyContractorEvent(
          state,
          row.payload as ContractorEventPayload,
          { contractorId: env.contractorId, occurredAt: env.occurredAt },
        );
      } catch {
        // The caller can pass a partial `serverSnapshot` (e.g. just the
        // entry the EntryEditor drawer is editing). If the queued tail
        // references entries outside that subset, applying those events
        // would throw with `apply: unknown <entryId>`. Skip them — the
        // worker is authoritative and the queue's own flush re-validates
        // on the server. Matches the try/catch in useOptimisticEntries.
      }
    }
    return state;
  }

  function foldProjectPending(
    base: ProjectStreamState | null | undefined,
    key: QueuedStreamKey,
  ): ProjectStreamState {
    // See foldContractorPending above for the rationale behind the
    // per-event try/catch.
    let state = base ?? emptyProjectStreamState;
    for (const row of pendingForKey(key)) {
      if (row.streamKind !== "project") continue;
      const env = row.envelope as ProjectEventEnvelope;
      try {
        state = applyProjectEvent(state, row.payload as ProjectEventPayload, {
          projectId: env.projectId,
          aggregateKind: env.aggregateKind,
          aggregateId: env.aggregateId,
          occurredAt: env.occurredAt,
        });
      } catch {
        // Skip pending events referencing aggregates outside the partial
        // snapshot — the worker is authoritative; the queue flush
        // re-validates server-side.
      }
    }
    return state;
  }

  // ---------------------------------------------------------------------------
  // Submission
  // ---------------------------------------------------------------------------

  async function submitContractorEvent(
    envelope: ContractorEventEnvelope,
    payload: ContractorEventPayload,
    ctx?: SubmitContractorCtx,
  ): Promise<SubmitOutcome> {
    const existing = await deps.storage.findByClientEventId(envelope.clientEventId);
    if (existing) return { kind: "duplicate", queued: existing };

    const key = streamKeyForContractor(envelope.contractorId);
    const projectedState = foldContractorPending(ctx?.serverSnapshot, key);
    const result = validateContractorEvent(projectedState, payload, {
      actorUserId: deps.actorUserId(),
      now: now(),
      isLockedAt: ctx?.isLockedAt,
    });
    if (!result.ok) {
      return { kind: "rejected_locally", errors: result.errors };
    }

    const queued = await deps.storage.enqueue({
      streamKind: "contractor",
      streamKey: key,
      envelope,
      payload,
      status: "pending",
      enqueuedAt: now(),
      attempts: 0,
      lastAttemptAt: null,
      confirmedSeq: null,
      lastError: null,
    });
    replaceInMirror(queued);
    publish();
    void flushStream(key);
    return { kind: "accepted_locally", queued };
  }

  async function submitProjectEvent(
    envelope: ProjectEventEnvelope,
    payload: ProjectEventPayload,
    ctx?: SubmitProjectCtx,
  ): Promise<SubmitOutcome> {
    const existing = await deps.storage.findByClientEventId(envelope.clientEventId);
    if (existing) return { kind: "duplicate", queued: existing };

    const key = streamKeyForProject(envelope.projectId);
    const projectedState = foldProjectPending(ctx?.serverSnapshot, key);
    const result = validateProjectEvent(projectedState, payload, {
      actorUserId: deps.actorUserId(),
      now: now(),
    });
    if (!result.ok) {
      return { kind: "rejected_locally", errors: result.errors };
    }

    const queued = await deps.storage.enqueue({
      streamKind: "project",
      streamKey: key,
      envelope,
      payload,
      status: "pending",
      enqueuedAt: now(),
      attempts: 0,
      lastAttemptAt: null,
      confirmedSeq: null,
      lastError: null,
    });
    replaceInMirror(queued);
    publish();
    void flushStream(key);
    return { kind: "accepted_locally", queued };
  }

  // ---------------------------------------------------------------------------
  // Flush loop
  // ---------------------------------------------------------------------------

  async function flushNow(): Promise<void> {
    const keys = new Set<QueuedStreamKey>();
    for (const e of mirror) {
      if (e.status === "pending") keys.add(e.streamKey);
    }
    await Promise.all([...keys].map(flushStream));
  }

  async function flushStream(key: QueuedStreamKey): Promise<void> {
    const existing = inFlightByStream.get(key);
    if (existing) return existing;
    const promise = (async () => {
      try {
        publish({ isFlushing: true });
        await drainStream(key);
      } finally {
        inFlightByStream.delete(key);
        publish({ isFlushing: false, lastFlushAt: now() });
      }
    })();
    inFlightByStream.set(key, promise);
    return promise;
  }

  async function drainStream(key: QueuedStreamKey): Promise<void> {
    while (true) {
      // Process rows strictly in `seq` order. Anything not yet `delivered`
      // is a candidate for being the head of the FIFO; if the head isn't
      // `pending` (e.g. it's `failed_validation` waiting on the user, or
      // `failed_transient` waiting on the backoff timer) we stop here —
      // we MUST NOT skip past it, or the worker would see events out of
      // user-intended order.
      const head = mirror
        .filter((e) => e.streamKey === key && e.status !== "delivered")
        .sort((a, b) => a.seq - b.seq)[0];
      if (!head) return;
      if (head.status !== "pending") return;

      const inFlight = await deps.storage.update(head.seq, {
        status: "in_flight",
        attempts: head.attempts + 1,
        lastAttemptAt: now(),
      });
      replaceInMirror(inFlight);
      publish();

      const result = await dispatch(inFlight);
      const transitioned = await applyResult(inFlight, result);
      replaceInMirror(transitioned);

      if (transitioned.status === "failed_transient") {
        publish({ isOnline: false });
        scheduleBackoff(key);
        return;
      }

      if (transitioned.status === "failed_validation") {
        // Park the head — drainStream returns; flushNow / future submits
        // will refuse to advance past this row until the user drops or
        // resolves it.
        publish();
        return;
      }

      // delivered or duplicate → publish + GC after retention, then loop on
      publish({ isOnline: true });
      backoffAttemptsByStream.delete(key);
      scheduleDeliveredGc(transitioned.seq);
      // Tolerate "no listener" in environments where the projection
      // services aren't wired (tests, isolated worker) — the queue still
      // does its job; cache invalidation simply has no consumer.
      void deps.services.messageService.reportSystemEffect
        .sendRequest({ scope: "time-event" })
        .catch(() => {});
    }
  }

  async function dispatch(row: QueuedEvent): Promise<SubmitEventResult> {
    if (row.streamKind === "contractor") {
      return deps.workerClient.submitContractorEvent({
        envelope: row.envelope as ContractorEventEnvelope,
        payload: row.payload as ContractorEventPayload,
      });
    }
    return deps.workerClient.submitProjectEvent({
      envelope: row.envelope as ProjectEventEnvelope,
      payload: row.payload as ProjectEventPayload,
    });
  }

  async function applyResult(
    row: QueuedEvent,
    result: SubmitEventResult,
  ): Promise<QueuedEvent> {
    switch (result.kind) {
      case "accepted":
      case "duplicate":
        return deps.storage.update(row.seq, {
          status: "delivered",
          confirmedSeq:
            result.kind === "accepted" ? result.seq : result.existingSeq,
          lastError: null,
        });
      case "validation_failed":
        return deps.storage.update(row.seq, {
          status: "failed_validation",
          lastError: {
            kind: "validation",
            message: "worker rejected event with validation errors",
            validationErrors: result.errors,
          },
        });
      case "schema_invalid":
        return deps.storage.update(row.seq, {
          status: "failed_validation",
          lastError: {
            kind: "schema",
            message: "worker rejected event as schema-invalid",
          },
        });
      case "concurrency_conflict":
        // Concurrency conflicts are user-meaningful (someone else modified
        // the same aggregate). Surface them just like validation failures —
        // the user resolves them via re-edit.
        return deps.storage.update(row.seq, {
          status: "failed_validation",
          lastError: {
            kind: "validation",
            message: `concurrency conflict — expected v${result.details.expected}, actual v${result.details.actual}`,
          },
        });
      case "transient_failure":
        // Park as `failed_transient` so the while-loop in drainStream sees
        // a non-pending status and exits cleanly. The backoff timer flips
        // it back to `pending` right before retrying, then re-enters the
        // flush loop.
        return deps.storage.update(row.seq, {
          status: "failed_transient",
          lastError: {
            kind: "transient",
            message: result.message,
          },
        });
    }
  }

  function scheduleBackoff(key: QueuedStreamKey): void {
    const previous = backoffTimers.get(key);
    if (previous) clearTimeoutImpl(previous);
    const attempt = (backoffAttemptsByStream.get(key) ?? 0) + 1;
    backoffAttemptsByStream.set(key, attempt);
    const delay = Math.min(
      backoffMaxMs,
      backoffBaseMs * Math.pow(2, attempt - 1),
    );
    const timer = setTimeoutImpl(async () => {
      backoffTimers.delete(key);
      // Reset every parked-as-failed_transient row in this stream back to
      // pending so the next drain pass picks them up again.
      const parked = mirror.filter(
        (e) => e.streamKey === key && e.status === "failed_transient",
      );
      for (const row of parked) {
        const reset = await deps.storage.update(row.seq, { status: "pending" });
        replaceInMirror(reset);
      }
      publish();
      void flushStream(key);
    }, delay);
    backoffTimers.set(key, timer);
  }

  function scheduleDeliveredGc(seq: number): void {
    setTimeoutImpl(() => {
      void deps.storage.remove(seq).then(() => {
        removeFromMirror(seq);
        publish();
      });
    }, deliveredRetentionMs);
  }

  // ---------------------------------------------------------------------------
  // Public surface
  // ---------------------------------------------------------------------------

  return {
    state: store,
    submitContractorEvent,
    submitProjectEvent,
    flushNow,
    drop: async (seq: number) => {
      const row = mirror.find((e) => e.seq === seq);
      if (!row) return;
      if (row.status === "in_flight" || row.status === "pending") return;
      await deps.storage.remove(seq);
      removeFromMirror(seq);
      publish();
    },
    pendingForContractor: (contractorId: number) =>
      pendingForKey(streamKeyForContractor(contractorId)),
    pendingForProject: (projectId: number) =>
      pendingForKey(streamKeyForProject(projectId)),
  };
}

/**
 * Helper: given a server snapshot + the queue's pending tail for a
 * contractor stream, return the optimistic state. Exposed so consumers
 * (TrackerBar, TimeEntryService overlay) can compute their own derived
 * projections without re-implementing the fold.
 */
export function applyPendingContractorEvents(
  base: ContractorStreamState | null | undefined,
  queued: ReadonlyArray<QueuedEvent>,
): ContractorStreamState {
  let state = base ?? emptyContractorStreamState;
  for (const row of queued) {
    if (row.streamKind !== "contractor") continue;
    const env = row.envelope as ContractorEventEnvelope;
    state = applyContractorEvent(state, row.payload as ContractorEventPayload, {
      contractorId: env.contractorId,
      occurredAt: env.occurredAt,
    });
  }
  return state;
}

export function applyPendingProjectEvents(
  base: ProjectStreamState | null | undefined,
  queued: ReadonlyArray<QueuedEvent>,
): ProjectStreamState {
  let state = base ?? emptyProjectStreamState;
  for (const row of queued) {
    if (row.streamKind !== "project") continue;
    const env = row.envelope as ProjectEventEnvelope;
    state = applyProjectEvent(state, row.payload as ProjectEventPayload, {
      projectId: env.projectId,
      aggregateKind: env.aggregateKind,
      aggregateId: env.aggregateId,
      occurredAt: env.occurredAt,
    });
  }
  return state;
}

/** Re-export {@link ValidationError} for convenience. */
export type { ValidationError };
