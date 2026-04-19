/**
 * Read-side endpoints. Used by the offline queue (to know if its expected
 * head is still current) and by tests. Returns the head/version, NOT the
 * full state — clients should hydrate read-models from the Supabase
 * projection tables, not from this Worker.
 */

import type { ProjectAggregateKind } from "@/api/time-event/time-event.api.ts";
import type { TimeEventStore } from "../store.ts";

export async function handleGetContractorHead(
  store: TimeEventStore,
  contractorId: number,
): Promise<{ contractorId: number; head: number }> {
  const snap = await store.loadContractorStream(contractorId);
  return { contractorId, head: snap.head };
}

export async function handleGetProjectHead(
  store: TimeEventStore,
  projectId: number,
): Promise<{ projectId: number; head: number }> {
  const snap = await store.loadProjectStream(projectId);
  return { projectId, head: snap.head };
}

export async function handleGetProjectAggregateHead(
  store: TimeEventStore,
  projectId: number,
  aggregateKind: ProjectAggregateKind,
  aggregateId: string,
): Promise<{
  projectId: number;
  aggregateKind: ProjectAggregateKind;
  aggregateId: string;
  version: number;
}> {
  const snap = await store.loadProjectStream(projectId);
  const key = `${aggregateKind}:${aggregateId}`;
  return {
    projectId,
    aggregateKind,
    aggregateId,
    version: snap.aggregateVersions[key] ?? 0,
  };
}
