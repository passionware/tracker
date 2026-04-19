/**
 * In-memory `TimeEventStore` implementation. Used by tests and by the local
 * `wrangler dev` smoke harness when no Supabase secrets are configured.
 *
 * Folds events through the shared reducers on every write so the snapshot is
 * always consistent — slow for large streams but trivially correct.
 */

import {
  applyContractorEvent,
  applyProjectEvent,
  emptyContractorStreamState,
  emptyProjectStreamState,
} from "@/api/time-event/aggregates";
import type {
  ContractorEventEnvelope,
  ContractorEventPayload,
  ProjectEventEnvelope,
  ProjectEventPayload,
} from "@/api/time-event/time-event.api.ts";
import type {
  AppendedEvent,
  ContractorStreamSnapshot,
  ProjectStreamSnapshot,
  TimeEventStore,
} from "./store.ts";
import {
  StoreConcurrencyError,
  StoreDuplicateClientEventError,
} from "./store.ts";

interface StoredContractorEvent {
  seq: number;
  eventId: string;
  receivedAt: string;
  actorUserId: string;
  envelope: ContractorEventEnvelope;
  payload: ContractorEventPayload;
}

interface StoredProjectEvent {
  seq: number;
  eventId: string;
  receivedAt: string;
  actorUserId: string;
  envelope: ProjectEventEnvelope;
  payload: ProjectEventPayload;
}

function newUuid(): string {
  // The Workers runtime exposes crypto.randomUUID(); fall back to a Node-ish
  // shim if missing (Node ≥19 has it too).
  return crypto.randomUUID();
}

export class InMemoryTimeEventStore implements TimeEventStore {
  private contractorEvents = new Map<number, StoredContractorEvent[]>();
  private contractorClientEventIndex = new Map<string, number>(); // key: `${contractorId}:${clientEventId}`
  private projectEvents = new Map<number, StoredProjectEvent[]>();
  private projectClientEventIndex = new Map<string, number>(); // key: `${projectId}:${clientEventId}`

  private now: () => Date;

  constructor(opts: { now?: () => Date } = {}) {
    this.now = opts.now ?? (() => new Date());
  }

  async lookupContractorEventByClientId(
    contractorId: number,
    clientEventId: string,
  ): Promise<{ seq: number } | null> {
    const seq = this.contractorClientEventIndex.get(
      `${contractorId}:${clientEventId}`,
    );
    return seq === undefined ? null : { seq };
  }

  async lookupProjectEventByClientId(
    projectId: number,
    clientEventId: string,
  ): Promise<{ seq: number } | null> {
    const seq = this.projectClientEventIndex.get(
      `${projectId}:${clientEventId}`,
    );
    return seq === undefined ? null : { seq };
  }

  async loadContractorStream(
    contractorId: number,
  ): Promise<ContractorStreamSnapshot> {
    const events = this.contractorEvents.get(contractorId) ?? [];
    let state = emptyContractorStreamState;
    for (const e of events) {
      state = applyContractorEvent(state, e.payload, {
        contractorId,
        occurredAt: e.envelope.occurredAt,
      });
    }
    return { state, head: events.length };
  }

  async appendContractorEvent(input: {
    actorUserId: string;
    envelope: ContractorEventEnvelope;
    payload: ContractorEventPayload;
  }): Promise<AppendedEvent<ContractorEventPayload>> {
    const { actorUserId, envelope, payload } = input;
    const contractorId = envelope.contractorId;

    const dedupKey = `${contractorId}:${envelope.clientEventId}`;
    const existingSeq = this.contractorClientEventIndex.get(dedupKey);
    if (existingSeq !== undefined) {
      throw new StoreDuplicateClientEventError(existingSeq);
    }

    const events = this.contractorEvents.get(contractorId) ?? [];
    if (
      envelope.expectedStreamVersion !== undefined &&
      envelope.expectedStreamVersion !== events.length
    ) {
      throw new StoreConcurrencyError("contractor stream head moved", {
        expected: envelope.expectedStreamVersion,
        actual: events.length,
      });
    }

    const seq = events.length + 1;
    const stored: StoredContractorEvent = {
      seq,
      eventId: newUuid(),
      receivedAt: this.now().toISOString(),
      actorUserId,
      envelope,
      payload,
    };
    events.push(stored);
    this.contractorEvents.set(contractorId, events);
    this.contractorClientEventIndex.set(dedupKey, seq);
    return {
      seq,
      eventId: stored.eventId,
      receivedAt: stored.receivedAt,
      envelope,
      payload,
    };
  }

  async loadProjectStream(projectId: number): Promise<ProjectStreamSnapshot> {
    const events = this.projectEvents.get(projectId) ?? [];
    let state = emptyProjectStreamState;
    const aggregateVersions: Record<string, number> = {};
    for (const e of events) {
      state = applyProjectEvent(state, e.payload, {
        projectId,
        occurredAt: e.envelope.occurredAt,
        aggregateKind: e.envelope.aggregateKind,
        aggregateId: e.envelope.aggregateId,
      });
      const key = `${e.envelope.aggregateKind}:${e.envelope.aggregateId}`;
      aggregateVersions[key] = (aggregateVersions[key] ?? 0) + 1;
    }
    return { state, head: events.length, aggregateVersions };
  }

  async appendProjectEvent(input: {
    actorUserId: string;
    envelope: ProjectEventEnvelope;
    payload: ProjectEventPayload;
  }): Promise<AppendedEvent<ProjectEventPayload>> {
    const { actorUserId, envelope, payload } = input;
    const projectId = envelope.projectId;

    const dedupKey = `${projectId}:${envelope.clientEventId}`;
    const existingSeq = this.projectClientEventIndex.get(dedupKey);
    if (existingSeq !== undefined) {
      throw new StoreDuplicateClientEventError(existingSeq);
    }

    const events = this.projectEvents.get(projectId) ?? [];
    if (envelope.expectedAggregateVersion !== undefined) {
      const aggKey = `${envelope.aggregateKind}:${envelope.aggregateId}`;
      const currentVersion = events.filter(
        (e) =>
          e.envelope.aggregateKind === envelope.aggregateKind &&
          e.envelope.aggregateId === envelope.aggregateId,
      ).length;
      if (envelope.expectedAggregateVersion !== currentVersion) {
        throw new StoreConcurrencyError(
          `project aggregate ${aggKey} version moved`,
          {
            expected: envelope.expectedAggregateVersion,
            actual: currentVersion,
          },
        );
      }
    }

    const seq = events.length + 1;
    const stored: StoredProjectEvent = {
      seq,
      eventId: newUuid(),
      receivedAt: this.now().toISOString(),
      actorUserId,
      envelope,
      payload,
    };
    events.push(stored);
    this.projectEvents.set(projectId, events);
    this.projectClientEventIndex.set(dedupKey, seq);
    return {
      seq,
      eventId: stored.eventId,
      receivedAt: stored.receivedAt,
      envelope,
      payload,
    };
  }
}
