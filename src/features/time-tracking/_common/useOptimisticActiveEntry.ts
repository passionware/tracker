import type { TimeEntry } from "@/api/time-entry/time-entry.api.ts";
import {
  applyContractorEvent,
  emptyContractorStreamState,
  type ContractorStreamState,
  type EntryState,
} from "@/api/time-event/aggregates";
import type {
  ContractorEventEnvelope,
  ContractorEventPayload,
} from "@/api/time-event/time-event.api.ts";
import type { QueuedEvent } from "@/api/time-event-queue/queued-event.api.ts";
import type { WithFrontServices } from "@/core/frontServices.ts";
import { useEventQueueState } from "@/features/time-tracking/_common/useEventQueueState.ts";
import { Maybe, RemoteData, rd } from "@passionware/monads";
import { useMemo } from "react";

/**
 * Optimistic snapshot of contractor X's stream — composed of the server's
 * single "active entry" projection (rehydrated as a {@link
 * ContractorStreamState}) folded with this contractor's pending tail from
 * the offline queue.
 *
 * Under the one-running-entry invariant (enforced by the reducer and by
 * a partial unique index in SQL), a contractor has at most one
 * `stoppedAt === null` entry. The bundle exposes that single entry plus
 * the base snapshots the tracker bar needs for re-validation.
 */
export interface OptimisticActiveBundle {
  /** State after folding pending events onto the projected snapshot. */
  state: ContractorStreamState;
  /** Server-only state (no queued events folded). Used as the
   *  `serverSnapshot` ctx when re-submitting commands so the queue's
   *  pre-flight validator re-folds *its own* tail (avoids double-fold). */
  serverState: ContractorStreamState;
  /**
   * The contractor's currently running entry, if any. When `null` the
   * contractor is idle. A running entry with `interruptedEntryId !== null`
   * is a "jump-on": conceptually the user paused a previous entry (now
   * stopped) and is planning to come back to it — the tracker bar offers
   * a "Resume <previous project>" affordance on Stop.
   */
  runningEntry: EntryState | null;
}

export function useOptimisticContractorBundle(
  props: WithFrontServices,
  contractorId: Maybe<number>,
): RemoteData<OptimisticActiveBundle | null> {
  const serverActive =
    props.services.timeEntryService.useActiveEntry(contractorId);
  const queueState = useEventQueueState(props);
  const pending = useMemo(() => {
    if (contractorId === undefined || contractorId === null) return [];
    // Read straight off the SimpleStore snapshot rather than the
    // `pendingForContractor` helper — the helper returns a fresh array
    // each call (unstable identity), which would defeat the memo below.
    return queueState.events
      .filter(
        (e) =>
          e.streamKind === "contractor" &&
          e.streamKey === `contractor:${contractorId}` &&
          (e.status === "pending" || e.status === "in_flight"),
      )
      .sort((a, b) => a.seq - b.seq);
  }, [queueState.events, contractorId]);

  // `pending` and `contractorId` must be passed as explicit deps: without
  // them, `rd.useMemoMap` only recomputes when the RemoteData identity
  // changes and keeps using stale closure values. That was the reason the
  // tracker bar said "Not tracking" while "My entries" already showed a
  // just-started (queue-pending) entry — the bundle never re-folded the
  // queue tail.
  return rd.useMemoMap(
    serverActive,
    (server, pendingDep, contractorIdDep) => {
      if (contractorIdDep === undefined || contractorIdDep === null) return null;
      const serverState = serverActiveToState(server, contractorIdDep);
      const state = foldPendingOnto(serverState, pendingDep, contractorIdDep);
      return {
        state,
        serverState,
        runningEntry: findRunning(state),
      };
    },
    pending,
    contractorId,
  );
}

/** Convenience hook returning just the single running entry. */
export function useOptimisticActiveEntry(
  props: WithFrontServices,
  contractorId: Maybe<number>,
): RemoteData<EntryState | null> {
  const bundle = useOptimisticContractorBundle(props, contractorId);
  return rd.useMemoMap(bundle, (b) => b?.runningEntry ?? null);
}

/**
 * Rehydrate a `ContractorStreamState` snapshot from the projection's single
 * "active entry" view. We can only reconstruct the running entry (the
 * projection doesn't return historical entries on this path), but that's
 * exactly what the validator + UI need to decide "is anything running?".
 */
function serverActiveToState(
  server: TimeEntry | null,
  contractorId: number,
): ContractorStreamState {
  if (!server) {
    return {
      ...emptyContractorStreamState,
      contractorId,
    };
  }
  const entry: EntryState = {
    entryId: server.id,
    contractorId: server.contractorId,
    clientId: server.clientId,
    workspaceId: server.workspaceId,
    projectId: server.projectId,
    taskId: server.taskId,
    taskVersion: server.taskVersion,
    activityId: server.activityId,
    activityVersion: server.activityVersion,
    startedAt: server.startedAt.toISOString(),
    stoppedAt: server.stoppedAt ? server.stoppedAt.toISOString() : null,
    description: server.description,
    tags: [...server.tags],
    rate: server.rateSnapshot,
    isPlaceholder: server.isPlaceholder,
    approvalState: server.approvalState,
    interruptedEntryId: server.interruptedEntryId,
    resumedFromEntryId: server.resumedFromEntryId,
    deletedAt: server.deletedAt ? server.deletedAt.toISOString() : null,
    lineage: [],
  };
  return {
    contractorId,
    entries: { [entry.entryId]: entry },
    importedTmetricIds: {},
  };
}

function foldPendingOnto(
  base: ContractorStreamState,
  pending: ReadonlyArray<QueuedEvent>,
  contractorId: number,
): ContractorStreamState {
  let state = base;
  for (const row of pending) {
    if (row.streamKind !== "contractor") continue;
    const env = row.envelope as ContractorEventEnvelope;
    try {
      state = applyContractorEvent(
        state,
        row.payload as ContractorEventPayload,
        {
          contractorId,
          occurredAt: env.occurredAt,
        },
      );
    } catch {
      // Pending event refers to an entry that wasn't part of the server
      // snapshot (e.g. a Stop for an entry whose Start hasn't been
      // delivered yet AND wasn't queued in this session). Skip rather
      // than crash the bar — the worker is authoritative and the queue's
      // own pre-flight already caught the obvious cases.
    }
  }
  return state;
}

function findRunning(state: ContractorStreamState): EntryState | null {
  for (const entry of Object.values(state.entries)) {
    if (entry.stoppedAt !== null || entry.deletedAt !== null) continue;
    return entry;
  }
  return null;
}
