/**
 * Supabase-backed {@link TimeEventStore}. This is what the prod / dev
 * `wrangler dev` deploy wires up — `InMemoryTimeEventStore` stays available
 * for tests and for devs that want to run the Worker without a database.
 *
 * Wiring philosophy
 * -----------------
 * * **Writes** go through the `append_contractor_event` / `append_project_event`
 *   RPCs (see
 *   `supabase/time_migrations/20260420074612_add_event_projections_and_append_rpcs.sql`).
 *   These do seq allocation, dedup and optimistic-concurrency checks in a
 *   single statement so the worker never has to juggle transactions from a
 *   stateless Cloudflare isolate.
 *
 * * **Reads** (`loadContractorStream`, `loadProjectStream`) pull the raw
 *   event rows via PostgREST and fold them through the exact same TS
 *   reducers the validator uses. This keeps the SQL projection triggers
 *   off the hot path of accepting new events (they run async after insert).
 *
 * * **Dedup lookups** (`lookupContractor/ProjectEventByClientId`) hit the
 *   unique `(stream_id, client_event_id)` index directly; the handler uses
 *   them to short-circuit before it even validates, so retries of a
 *   previously-accepted event bypass revalidation entirely.
 *
 * Secrets come from `env.SUPABASE_URL` + `env.SUPABASE_SERVICE_ROLE_KEY`.
 * The schema is selected with `env.TIME_SCHEMA` (`time_dev` / `time_prod`).
 * service_role bypasses RLS but the event tables have `REVOKE ALL FROM
 * anon, authenticated` so nothing else can write to them.
 */

import { createClient } from "@supabase/supabase-js";

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

/**
 * Build a Supabase-backed store. The schema is required because event
 * tables live in `time_dev` / `time_prod`; supabase-js only lets us target
 * one schema per client instance, so the whole store works inside that
 * schema.
 */
/**
 * The worker writes to a non-`public` schema (`time_dev` / `time_prod`).
 * `supabase-js`'s typed `SupabaseClient` pins a schema generic and refuses
 * any non-public value when types aren't provided, so we drop the typing
 * and use the loose runtime client here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

export function createSupabaseTimeEventStore(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  schema: "time_dev" | "time_prod";
}): TimeEventStore {
  const client = createClient(params.supabaseUrl, params.serviceRoleKey, {
    auth: {
      // The Worker has no session; we drive the service role via the API key.
      persistSession: false,
      autoRefreshToken: false,
    },
    db: { schema: params.schema },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  return new SupabaseTimeEventStore(client as AnySupabaseClient);
}

// ----- Row types as returned by PostgREST ------------------------------------

interface ContractorEventRow {
  id: string;
  contractor_id: number;
  seq: number;
  type: string;
  payload: unknown;
  client_event_id: string;
  actor_user_id: string;
  received_at: string;
  correlation_id: string;
  causation_id: string | null;
  event_version: number;
}

interface ProjectEventRow {
  id: string;
  project_id: number;
  seq: number;
  aggregate_kind: "task" | "activity" | "rate" | "period_lock";
  aggregate_id: string;
  type: string;
  payload: unknown;
  client_event_id: string;
  actor_user_id: string;
  received_at: string;
  correlation_id: string;
  causation_id: string | null;
  event_version: number;
}

// ----- RPC responses ---------------------------------------------------------

type AppendRpcResult =
  | {
      outcome: "accepted";
      seq: number;
      eventId: string;
      receivedAt: string;
    }
  | {
      outcome: "duplicate";
      seq: number;
      eventId: string;
    }
  | {
      outcome: "conflict";
      expected: number;
      actual: number;
    };

// ----- Store -----------------------------------------------------------------

class SupabaseTimeEventStore implements TimeEventStore {
  constructor(private readonly client: AnySupabaseClient) {}

  async lookupContractorEventByClientId(
    contractorId: number,
    clientEventId: string,
  ): Promise<{ seq: number } | null> {
    const { data, error } = await this.client
      .from("contractor_event")
      .select("seq")
      .eq("contractor_id", contractorId)
      .eq("client_event_id", clientEventId)
      .maybeSingle();
    if (error) throw error;
    return data ? { seq: Number(data.seq) } : null;
  }

  async lookupProjectEventByClientId(
    projectId: number,
    clientEventId: string,
  ): Promise<{ seq: number } | null> {
    const { data, error } = await this.client
      .from("project_event")
      .select("seq")
      .eq("project_id", projectId)
      .eq("client_event_id", clientEventId)
      .maybeSingle();
    if (error) throw error;
    return data ? { seq: Number(data.seq) } : null;
  }

  async loadContractorStream(
    contractorId: number,
  ): Promise<ContractorStreamSnapshot> {
    // Pull all events for this contractor in seq order; validator needs a
    // coherent end-of-stream state, so a partial fold is not an option.
    // `contractor_event` has `entry_count_total`-style bounds per
    // contractor-per-day so this stays cheap in practice; if it ever
    // balloons we'll add a snapshots table and fold from there.
    const { data, error } = await this.client
      .from("contractor_event")
      .select("*")
      .eq("contractor_id", contractorId)
      .order("seq", { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as ContractorEventRow[];
    let state = emptyContractorStreamState;
    for (const row of rows) {
      state = applyContractorEvent(
        state,
        row.payload as ContractorEventPayload,
        {
          contractorId,
          occurredAt: row.received_at,
        },
      );
    }
    const head = rows.length > 0 ? Number(rows[rows.length - 1].seq) : 0;
    return { state, head };
  }

  async appendContractorEvent(input: {
    actorUserId: string;
    envelope: ContractorEventEnvelope;
    payload: ContractorEventPayload;
  }): Promise<AppendedEvent<ContractorEventPayload>> {
    const { actorUserId, envelope, payload } = input;
    const { data, error } = await this.client.rpc("append_contractor_event", {
      p_contractor_id: envelope.contractorId,
      p_type: payload.type,
      p_payload: payload,
      p_client_event_id: envelope.clientEventId,
      p_actor_user_id: actorUserId,
      p_correlation_id: envelope.correlationId,
      p_causation_id: null,
      p_event_version: envelope.eventVersion ?? 1,
      p_expected_stream_version: envelope.expectedStreamVersion ?? null,
    });
    if (error) throw error;
    const result = data as AppendRpcResult;
    return handleAppendResult(result, envelope, payload);
  }

  async loadProjectStream(projectId: number): Promise<ProjectStreamSnapshot> {
    const { data, error } = await this.client
      .from("project_event")
      .select("*")
      .eq("project_id", projectId)
      .order("seq", { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as ProjectEventRow[];
    let state = emptyProjectStreamState;
    const aggregateVersions: Record<string, number> = {};
    for (const row of rows) {
      state = applyProjectEvent(state, row.payload as ProjectEventPayload, {
        projectId,
        occurredAt: row.received_at,
        aggregateKind: row.aggregate_kind,
        aggregateId: row.aggregate_id,
      });
      const key = `${row.aggregate_kind}:${row.aggregate_id}`;
      aggregateVersions[key] = (aggregateVersions[key] ?? 0) + 1;
    }
    const head = rows.length > 0 ? Number(rows[rows.length - 1].seq) : 0;
    return { state, head, aggregateVersions };
  }

  async appendProjectEvent(input: {
    actorUserId: string;
    envelope: ProjectEventEnvelope;
    payload: ProjectEventPayload;
  }): Promise<AppendedEvent<ProjectEventPayload>> {
    const { actorUserId, envelope, payload } = input;
    const { data, error } = await this.client.rpc("append_project_event", {
      p_project_id: envelope.projectId,
      p_aggregate_kind: envelope.aggregateKind,
      p_aggregate_id: envelope.aggregateId,
      p_type: payload.type,
      p_payload: payload,
      p_client_event_id: envelope.clientEventId,
      p_actor_user_id: actorUserId,
      p_correlation_id: envelope.correlationId,
      p_causation_id: null,
      p_event_version: envelope.eventVersion ?? 1,
      p_expected_aggregate_version:
        envelope.expectedAggregateVersion ?? null,
    });
    if (error) throw error;
    const result = data as AppendRpcResult;
    return handleAppendResult(result, envelope, payload);
  }
}

function handleAppendResult<TPayload>(
  result: AppendRpcResult,
  envelope: TPayload extends ContractorEventPayload
    ? ContractorEventEnvelope
    : ProjectEventEnvelope,
  payload: TPayload,
): AppendedEvent<TPayload> {
  switch (result.outcome) {
    case "accepted":
      return {
        seq: Number(result.seq),
        eventId: result.eventId,
        receivedAt: result.receivedAt,
        envelope,
        payload,
      };
    case "duplicate":
      throw new StoreDuplicateClientEventError(Number(result.seq));
    case "conflict":
      throw new StoreConcurrencyError(
        "stream/aggregate head moved since the client snapshot",
        {
          expected: Number(result.expected),
          actual: Number(result.actual),
        },
      );
    default: {
      const _exhaustive: never = result;
      void _exhaustive;
      throw new Error("unreachable");
    }
  }
}
