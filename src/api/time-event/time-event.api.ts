/**
 * Public surface of the time-event domain.
 *
 * Re-exports the shared Zod schemas + inferred TypeScript types so consumers
 * (frontend services, the future Cloudflare Worker, tests) can import from a
 * single, stable entry point.
 *
 * Pure-TS / Zod only — safe to import from a Cloudflare Worker.
 *
 * Example:
 * ```ts
 * import {
 *   contractorEventSchema,
 *   type ContractorEvent,
 *   type ContractorEventOf,
 * } from "@/api/time-event/time-event.api.ts";
 *
 * const parsed = contractorEventSchema.parse(req.body);
 * const startedPayload: ContractorEventOf<"EntryStarted"> = ...;
 * ```
 */

export {
  rateDefinitionSchema,
  rateSnapshotSchema,
  computeNetValue,
  quantityFromDuration,
  type RateDefinition,
  type RateSnapshot,
} from "@/api/time-event/rate-snapshot.schema.ts";

export {
  contractorEventEnvelopeSchema,
  projectEventEnvelopeSchema,
  projectAggregateKindSchema,
  EVENT_VERSION_V1,
  eventEnvelopeShared,
  type ContractorEventEnvelope,
  type ProjectEventEnvelope,
  type ProjectAggregateKind,
} from "@/api/time-event/event-envelope.schema.ts";

export {
  contractorEventPayloadSchema,
  contractorEventSchema,
  type ContractorEventPayload,
  type ContractorEventType,
  type ContractorEvent,
  type ContractorEventOf,
} from "@/api/time-event/contractor-event.schema.ts";

export {
  taskEventPayloadSchema,
  activityEventPayloadSchema,
  rateEventPayloadSchema,
  periodLockEventPayloadSchema,
  projectEventPayloadSchema,
  projectEventSchema,
  externalLinkProviderSchema,
  type TaskEventPayload,
  type ActivityEventPayload,
  type RateEventPayload,
  type PeriodLockEventPayload,
  type ProjectEventPayload,
  type ProjectEventType,
  type ProjectEvent,
  type ProjectEventOf,
  type ExternalLink,
  type ExternalLinkProvider,
} from "@/api/time-event/project-event.schema.ts";
