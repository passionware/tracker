/**
 * Persistence boundary for the time-events Worker.
 *
 * The Hono handlers depend only on this interface; concrete implementations
 * are wired in `index.ts` (Supabase, prod/dev) and `test/harness.ts`
 * (in-memory, tests).
 */

import type {
  ContractorEventEnvelope,
  ContractorEventPayload,
  ProjectAggregateKind,
  ProjectEventEnvelope,
  ProjectEventPayload,
} from "@/api/time-event/time-event.api.ts";
import type {
  ContractorStreamState,
  ProjectStreamState,
} from "@/api/time-event/aggregates";

export interface AppendedEvent<TPayload> {
  /** Authoritative monotonic sequence the row landed at. */
  seq: number;
  /** Server-assigned UUID of the persisted event row. */
  eventId: string;
  /** Server-stamped acceptance time. */
  receivedAt: string;
  envelope: TPayload extends ContractorEventPayload
    ? ContractorEventEnvelope
    : ProjectEventEnvelope;
  payload: TPayload;
}

export interface ContractorStreamSnapshot {
  state: ContractorStreamState;
  /** Latest `seq` in the stream. 0 when the stream is empty. */
  head: number;
}

export interface ProjectStreamSnapshot {
  state: ProjectStreamState;
  head: number;
  /** Per-aggregate version map (used by the Worker for the optimistic
   *  concurrency check). Empty for new aggregates. */
  aggregateVersions: Record<string, number>;
}

/**
 * Errors a store can raise. The Worker maps these to HTTP status codes.
 */
export class StoreConcurrencyError extends Error {
  constructor(
    message: string,
    public readonly details: { expected: number; actual: number },
  ) {
    super(message);
    this.name = "StoreConcurrencyError";
  }
}

export class StoreDuplicateClientEventError extends Error {
  constructor(public readonly existingSeq: number) {
    super(`duplicate clientEventId; existing seq=${existingSeq}`);
    this.name = "StoreDuplicateClientEventError";
  }
}

export interface TimeEventStore {
  /**
   * Fast dedup lookup. Used by the Worker BEFORE validation: if a previous
   * submission with the same `clientEventId` already landed, we short-circuit
   * with the original `seq` instead of re-validating (because the state has
   * since moved past the duplicate's effects).
   *
   * Returns `null` when no prior submission was recorded.
   */
  lookupContractorEventByClientId(
    contractorId: number,
    clientEventId: string,
  ): Promise<{ seq: number } | null>;

  lookupProjectEventByClientId(
    projectId: number,
    clientEventId: string,
  ): Promise<{ seq: number } | null>;

  /**
   * Load the current state for a contractor stream. Implementations may either
   * fold all events from scratch (correct, expensive) or return a snapshot
   * (fast, eventually-consistent). The Worker only requires correctness for
   * the tail used by the validator.
   */
  loadContractorStream(
    contractorId: number,
  ): Promise<ContractorStreamSnapshot>;

  /**
   * Append a single contractor event. Server stamps `seq`, `eventId`,
   * `receivedAt` and the actor user.
   *
   * @throws StoreConcurrencyError when `expectedStreamVersion` is set and no
   *         longer matches the head.
   * @throws StoreDuplicateClientEventError when the same `clientEventId` was
   *         already accepted; caller should treat as success and return the
   *         stored seq for idempotent retries.
   */
  appendContractorEvent(input: {
    actorUserId: string;
    envelope: ContractorEventEnvelope;
    payload: ContractorEventPayload;
  }): Promise<AppendedEvent<ContractorEventPayload>>;

  loadProjectStream(projectId: number): Promise<ProjectStreamSnapshot>;

  appendProjectEvent(input: {
    actorUserId: string;
    envelope: ProjectEventEnvelope;
    payload: ProjectEventPayload;
  }): Promise<AppendedEvent<ProjectEventPayload>>;
}

export type AggregateKey =
  | { kind: "contractor"; contractorId: number }
  | {
      kind: "project";
      projectId: number;
      aggregateKind: ProjectAggregateKind;
      aggregateId: string;
    };
