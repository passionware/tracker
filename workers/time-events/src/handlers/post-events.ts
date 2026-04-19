/**
 * POST /events handler. Single submission point for both contractor and
 * project event streams. The body discriminates on `stream`.
 *
 * Pipeline (mirrors the Worker validation pipeline in the plan):
 *   1. Parse + Zod schema-validate the request body.
 *   2. Verify caller JWT and resolve `actorUserId`.
 *   3. Load current stream snapshot via the injected `TimeEventStore`.
 *   4. Run the shared command validator against snapshot state.
 *   5. Append the event; map StoreConcurrencyError /
 *      StoreDuplicateClientEventError to actionable HTTP responses.
 *
 * The handler is testable in isolation via `handlePostEvents(deps, body)`
 * without spinning up Hono.
 */

import { z } from "zod";
import {
  contractorEventSchema,
  projectEventSchema,
  type ContractorEventEnvelope,
  type ContractorEventPayload,
  type ProjectEventEnvelope,
  type ProjectEventPayload,
} from "@/api/time-event/time-event.api.ts";
import {
  validateContractorEvent,
  validateProjectEvent,
  isPeriodLockedAt,
  type ValidationError,
} from "@/api/time-event/aggregates";
import {
  StoreConcurrencyError,
  StoreDuplicateClientEventError,
  type AppendedEvent,
  type TimeEventStore,
} from "../store.ts";

// ---------------------------------------------------------------------------
// Request envelopes
// ---------------------------------------------------------------------------

const contractorRequestSchema = contractorEventSchema.extend({
  stream: z.literal("contractor"),
});

const projectRequestSchema = projectEventSchema.extend({
  stream: z.literal("project"),
});

export const postEventsBodySchema = z.discriminatedUnion("stream", [
  contractorRequestSchema,
  projectRequestSchema,
]);

export type PostEventsBody = z.infer<typeof postEventsBodySchema>;

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type PostEventsResult =
  | {
      kind: "accepted";
      stream: "contractor" | "project";
      event: AppendedEvent<ContractorEventPayload | ProjectEventPayload>;
    }
  | {
      kind: "duplicate";
      stream: "contractor" | "project";
      existingSeq: number;
    }
  | {
      kind: "schema_invalid";
      issues: z.ZodIssue[];
    }
  | {
      kind: "validation_failed";
      errors: ValidationError[];
    }
  | {
      kind: "concurrency_conflict";
      details: { expected: number; actual: number };
    };

export interface PostEventsDeps {
  store: TimeEventStore;
  actorUserId: string;
  now: Date;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handlePostEvents(
  deps: PostEventsDeps,
  rawBody: unknown,
): Promise<PostEventsResult> {
  const parsed = postEventsBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return { kind: "schema_invalid", issues: parsed.error.issues };
  }
  const body = parsed.data;

  if (body.stream === "contractor") {
    return await processContractor(deps, body);
  }
  return await processProject(deps, body);
}

async function processContractor(
  deps: PostEventsDeps,
  body: { envelope: ContractorEventEnvelope; payload: ContractorEventPayload },
): Promise<PostEventsResult> {
  // Dedup BEFORE validation: a retried submission must short-circuit even when
  // the (now-progressed) state would no longer accept the original command.
  const dup = await deps.store.lookupContractorEventByClientId(
    body.envelope.contractorId,
    body.envelope.clientEventId,
  );
  if (dup) {
    return { kind: "duplicate", stream: "contractor", existingSeq: dup.seq };
  }

  const snapshot = await deps.store.loadContractorStream(
    body.envelope.contractorId,
  );

  // Period-lock check requires the project stream's snapshot too. We load it
  // lazily, only when the payload references a projectId (entry-* events do).
  const projectIdFromPayload = extractProjectIdFromContractorPayload(body.payload);
  let isLockedAt: ((input: { projectId: number; contractorId: number; occurredAt: string }) => boolean) | undefined;
  if (projectIdFromPayload !== undefined) {
    const projectSnap = await deps.store.loadProjectStream(projectIdFromPayload);
    isLockedAt = (input) => isPeriodLockedAt(projectSnap.state, input);
  }

  const validation = validateContractorEvent(snapshot.state, body.payload, {
    actorUserId: deps.actorUserId,
    now: deps.now,
    isLockedAt,
  });
  if (!validation.ok) {
    return { kind: "validation_failed", errors: validation.errors };
  }

  try {
    const appended = await deps.store.appendContractorEvent({
      actorUserId: deps.actorUserId,
      envelope: body.envelope,
      payload: body.payload,
    });
    return { kind: "accepted", stream: "contractor", event: appended };
  } catch (e) {
    if (e instanceof StoreDuplicateClientEventError) {
      return { kind: "duplicate", stream: "contractor", existingSeq: e.existingSeq };
    }
    if (e instanceof StoreConcurrencyError) {
      return { kind: "concurrency_conflict", details: e.details };
    }
    throw e;
  }
}

async function processProject(
  deps: PostEventsDeps,
  body: { envelope: ProjectEventEnvelope; payload: ProjectEventPayload },
): Promise<PostEventsResult> {
  const dup = await deps.store.lookupProjectEventByClientId(
    body.envelope.projectId,
    body.envelope.clientEventId,
  );
  if (dup) {
    return { kind: "duplicate", stream: "project", existingSeq: dup.seq };
  }

  const snapshot = await deps.store.loadProjectStream(body.envelope.projectId);
  const validation = validateProjectEvent(snapshot.state, body.payload, {
    actorUserId: deps.actorUserId,
    now: deps.now,
  });
  if (!validation.ok) {
    return { kind: "validation_failed", errors: validation.errors };
  }

  try {
    const appended = await deps.store.appendProjectEvent({
      actorUserId: deps.actorUserId,
      envelope: body.envelope,
      payload: body.payload,
    });
    return { kind: "accepted", stream: "project", event: appended };
  } catch (e) {
    if (e instanceof StoreDuplicateClientEventError) {
      return { kind: "duplicate", stream: "project", existingSeq: e.existingSeq };
    }
    if (e instanceof StoreConcurrencyError) {
      return { kind: "concurrency_conflict", details: e.details };
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractProjectIdFromContractorPayload(
  payload: ContractorEventPayload,
): number | undefined {
  switch (payload.type) {
    case "EntryStarted":
    case "EntryRoutingChanged":
    case "EntryImportedFromTmetric":
      return payload.projectId;
    default:
      return undefined;
  }
}
