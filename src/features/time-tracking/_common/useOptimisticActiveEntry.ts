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
 * Returns a single bundle so the bar can derive *all* views (running
 * primary, running jump-on, base snapshot for re-validation) from one
 * memoised computation rather than re-folding three times.
 */
export interface OptimisticActiveBundle {
  /** State after folding pending events onto the projected snapshot. */
  state: ContractorStreamState;
  /** Server-only state (no queued events folded). Used as the
   *  `serverSnapshot` ctx when re-submitting commands so the queue's
   *  pre-flight validator re-folds *its own* tail (avoids double-fold). */
  serverState: ContractorStreamState;
  /** Currently running primary entry (`interruptedEntryId === null`). */
  runningPrimary: EntryState | null;
  /** Currently running jump-on entry (`interruptedEntryId !== null`). */
  runningJumpOn: EntryState | null;
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

  return rd.useMemoMap(serverActive, (server) => {
    if (contractorId === undefined || contractorId === null) return null;
    const serverState = serverActiveToState(server, contractorId);
    const state = foldPendingOnto(serverState, pending, contractorId);
    return {
      state,
      serverState,
      runningPrimary: findRunning(state, "primary"),
      runningJumpOn: findRunning(state, "jump-on"),
    };
  });
}

/** Convenience hook returning just the running primary entry. */
export function useOptimisticActiveEntry(
  props: WithFrontServices,
  contractorId: Maybe<number>,
): RemoteData<EntryState | null> {
  const bundle = useOptimisticContractorBundle(props, contractorId);
  return rd.useMemoMap(bundle, (b) => b?.runningPrimary ?? null);
}

/** Convenience hook returning just the running jump-on entry. */
export function useOptimisticActiveJumpOn(
  props: WithFrontServices,
  contractorId: Maybe<number>,
): RemoteData<EntryState | null> {
  const bundle = useOptimisticContractorBundle(props, contractorId);
  return rd.useMemoMap(bundle, (b) => b?.runningJumpOn ?? null);
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

function findRunning(
  state: ContractorStreamState,
  kind: "primary" | "jump-on",
): EntryState | null {
  for (const entry of Object.values(state.entries)) {
    if (entry.stoppedAt !== null || entry.deletedAt !== null) continue;
    const isJumpOn = entry.interruptedEntryId !== null;
    if (kind === "primary" && !isJumpOn) return entry;
    if (kind === "jump-on" && isJumpOn) return entry;
  }
  return null;
}
