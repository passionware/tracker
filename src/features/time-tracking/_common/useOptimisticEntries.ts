import type { TimeEntry, TimeEntryQuery } from "@/api/time-entry/time-entry.api.ts";
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
 * Optimistic union of "entries the server has projected" + "entries the
 * queue knows about but hasn't delivered yet".
 *
 * Strategy:
 *   1. Build an in-memory `ContractorStreamState` from server entries (via
 *      {@link rebuildStateFromServerEntries}). The state is "as if those
 *      events had been replayed" — good enough for fold-and-project.
 *   2. Fold the queue's pending tail (filtered to this contractor) on top.
 *   3. Project back to a list of entries the UI cares about, filtering by
 *      the same query criteria that the server already applied.
 *
 * The returned items use {@link EntryState} (the aggregate's projection
 * shape), not {@link TimeEntry}, so they cleanly carry the optimistic
 * "isPending" flag for queued-but-not-confirmed entries.
 *
 * Filtering: server filters are re-applied here for the queued tail (the
 * queue can produce events for any contractor; we already filtered on
 * stream). The shared filters covered are `approvalState`, `taskId`,
 * `projectId`. Date / pagination filters are ignored on the overlay (queued
 * events are always "now-ish" and few in number, so they always land in
 * any time-range a user is currently looking at).
 */
export interface OptimisticEntry extends EntryState {
  /** True when this entry is still in the offline queue. */
  isPending: boolean;
  /** True when the queue tried and failed validation; UI should highlight. */
  isFailed: boolean;
}

export function useOptimisticEntries(
  props: WithFrontServices,
  query: Maybe<TimeEntryQuery>,
): RemoteData<OptimisticEntry[]> {
  const serverEntries = props.services.timeEntryService.useEntries(
    query ?? {},
  );
  const queueState = useEventQueueState(props);

  const pendingByContractor = useMemo(() => {
    const map = new Map<number, QueuedEvent[]>();
    for (const e of queueState.events) {
      if (e.streamKind !== "contractor") continue;
      if (e.status !== "pending" && e.status !== "in_flight") continue;
      const contractorId = (e.envelope as ContractorEventEnvelope).contractorId;
      const arr = map.get(contractorId);
      if (arr) arr.push(e);
      else map.set(contractorId, [e]);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.seq - b.seq);
    return map;
  }, [queueState.events]);

  const failedSeqByEntryId = useMemo(() => {
    const map = new Map<string, true>();
    for (const e of queueState.events) {
      if (e.streamKind !== "contractor") continue;
      if (e.status !== "failed_validation" && e.status !== "failed_transient")
        continue;
      const payload = e.payload as ContractorEventPayload;
      if (
        "entryId" in payload &&
        typeof (payload as { entryId?: string }).entryId === "string"
      ) {
        map.set((payload as { entryId: string }).entryId, true);
      }
    }
    return map;
  }, [queueState.events]);

  return rd.useMemoMap(serverEntries, (server) => {
    if (!query) return [];
    const contractorIds = new Set<number>();
    for (const entry of server) contractorIds.add(entry.contractorId);
    if (query.contractorId !== undefined) contractorIds.add(query.contractorId);
    for (const cid of pendingByContractor.keys()) contractorIds.add(cid);

    const merged: OptimisticEntry[] = [];
    const seen = new Set<string>();

    for (const contractorId of contractorIds) {
      const baseState = rebuildStateFromServerEntries(
        contractorId,
        server.filter((e) => e.contractorId === contractorId),
      );
      const queuedForContractor = pendingByContractor.get(contractorId) ?? [];
      const folded = foldPendingOnto(baseState, queuedForContractor, contractorId);

      for (const entry of Object.values(folded.entries)) {
        if (entry.deletedAt !== null && !query.includeDeleted) continue;
        if (!matchesFilters(entry, query)) continue;
        if (seen.has(entry.entryId)) continue;
        seen.add(entry.entryId);
        merged.push({
          ...entry,
          isPending: queuedForContractor.some((q) => entryIdOf(q) === entry.entryId),
          isFailed: failedSeqByEntryId.has(entry.entryId),
        });
      }
    }
    merged.sort(
      (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt),
    );
    return merged;
  });
}

function rebuildStateFromServerEntries(
  contractorId: number,
  entries: ReadonlyArray<TimeEntry>,
): ContractorStreamState {
  const state: ContractorStreamState = {
    ...emptyContractorStreamState,
    contractorId,
    entries: {},
    importedTmetricIds: {},
  };
  // We mutate a draft locally and return — the function is private and the
  // caller treats the result as immutable.
  for (const e of entries) {
    state.entries[e.id] = {
      entryId: e.id,
      contractorId: e.contractorId,
      clientId: e.clientId,
      workspaceId: e.workspaceId,
      projectId: e.projectId,
      taskId: e.taskId,
      taskVersion: e.taskVersion,
      activityId: e.activityId,
      activityVersion: e.activityVersion,
      startedAt: e.startedAt.toISOString(),
      stoppedAt: e.stoppedAt ? e.stoppedAt.toISOString() : null,
      description: e.description,
      tags: [...e.tags],
      rate: e.rateSnapshot,
      isPlaceholder: e.isPlaceholder,
      approvalState: e.approvalState,
      interruptedEntryId: e.interruptedEntryId,
      resumedFromEntryId: e.resumedFromEntryId,
      deletedAt: e.deletedAt ? e.deletedAt.toISOString() : null,
      lineage: [],
    };
  }
  return state;
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
        { contractorId, occurredAt: env.occurredAt },
      );
    } catch {
      // Pending event references unknown entry (e.g. an EntryStopped whose
      // EntryStarted hasn't been delivered AND wasn't queued — shouldn't
      // happen, but if it does we skip rather than crash the optimistic
      // overlay. Worker is authoritative; the queue's own pre-flight
      // validator already caught most of these.
    }
  }
  return state;
}

function matchesFilters(entry: EntryState, query: TimeEntryQuery): boolean {
  if (query.contractorId !== undefined && entry.contractorId !== query.contractorId)
    return false;
  if (query.projectId !== undefined && entry.projectId !== query.projectId)
    return false;
  if (query.clientId !== undefined && entry.clientId !== query.clientId) return false;
  if (
    query.workspaceId !== undefined &&
    entry.workspaceId !== query.workspaceId
  )
    return false;
  if (query.taskId !== undefined && entry.taskId !== query.taskId) return false;
  if (query.activityId !== undefined && entry.activityId !== query.activityId)
    return false;
  if (query.approvalState !== undefined) {
    const wanted = Array.isArray(query.approvalState)
      ? query.approvalState
      : [query.approvalState];
    if (!wanted.includes(entry.approvalState)) return false;
  }
  if (query.onlyActive && entry.stoppedAt !== null) return false;
  if (query.onlyPlaceholders && !entry.isPlaceholder) return false;
  if (query.startedFrom && Date.parse(entry.startedAt) < query.startedFrom.getTime())
    return false;
  if (query.startedTo && Date.parse(entry.startedAt) >= query.startedTo.getTime())
    return false;
  return true;
}

function entryIdOf(row: QueuedEvent): string | null {
  const payload = row.payload as ContractorEventPayload;
  if ("entryId" in payload && typeof payload.entryId === "string") {
    return payload.entryId;
  }
  return null;
}
