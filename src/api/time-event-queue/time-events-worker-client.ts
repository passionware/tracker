import type {
  ContractorEventEnvelope,
  ContractorEventPayload,
  ProjectEventEnvelope,
  ProjectEventPayload,
} from "@/api/time-event/time-event.api";
import type { ValidationError } from "@/api/time-event/aggregates";

/**
 * HTTP client for the `time-events` Cloudflare Worker. The result mirrors
 * the worker's `PostEventsResult` so the EventQueueService can map
 * outcomes onto queue lifecycle transitions without re-decoding the body
 * twice.
 */
export type SubmitEventResult =
  | { kind: "accepted"; stream: "contractor" | "project"; seq: number }
  | { kind: "duplicate"; stream: "contractor" | "project"; existingSeq: number }
  | { kind: "validation_failed"; errors: ValidationError[] }
  | { kind: "schema_invalid"; details?: unknown }
  | {
      kind: "concurrency_conflict";
      details: { expected: number; actual: number };
    }
  | { kind: "transient_failure"; httpStatus?: number; message: string };

export interface SubmitContractorEventInput {
  envelope: ContractorEventEnvelope;
  payload: ContractorEventPayload;
}

export interface SubmitProjectEventInput {
  envelope: ProjectEventEnvelope;
  payload: ProjectEventPayload;
}

export interface TimeEventsWorkerClient {
  submitContractorEvent: (
    input: SubmitContractorEventInput,
  ) => Promise<SubmitEventResult>;
  submitProjectEvent: (
    input: SubmitProjectEventInput,
  ) => Promise<SubmitEventResult>;
}
