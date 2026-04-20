import type { TimeEntry } from "@/api/time-entry/time-entry.api";
import type { RateSnapshot } from "@/api/time-event/time-event.api";
import { z } from "zod";

const approvalState$ = z.enum(["draft", "submitted", "approved", "rejected"]);

/**
 * Raw row shape of `time_*.entry` returned by Supabase. Numeric columns are
 * `bigint`/`numeric` in Postgres but Supabase JS returns them as JS numbers
 * here because all IDs we use stay within safe-integer range and PostgREST
 * stringifies numeric values which Zod coerces below.
 */
export const timeEntry$ = z.object({
  id: z.string().uuid(),
  contractor_id: z.number(),
  client_id: z.number(),
  workspace_id: z.number(),
  project_id: z.number(),
  task_id: z.string().uuid().nullable(),
  task_version: z.number().nullable(),
  activity_id: z.string().uuid().nullable(),
  activity_version: z.number().nullable(),
  started_at: z.coerce.date(),
  stopped_at: z.coerce.date().nullable(),
  duration_seconds: z.number().nullable(),
  description: z.string().nullable(),
  tags: z.array(z.string()),
  rate_unit: z.string(),
  rate_quantity: z.coerce.number(),
  rate_unit_price: z.coerce.number(),
  rate_currency: z.string(),
  rate_net_value: z.coerce.number(),
  is_placeholder: z.boolean(),
  approval_state: approvalState$,
  approval_decided_at: z.coerce.date().nullable(),
  approval_decided_by: z.string().uuid().nullable(),
  approval_reason: z.string().nullable(),
  split_from_entry_id: z.string().uuid().nullable(),
  interrupted_entry_id: z.string().uuid().nullable(),
  resumed_from_entry_id: z.string().uuid().nullable(),
  deleted_at: z.coerce.date().nullable(),
  event_count: z.number(),
  last_event_id: z.string().uuid().nullable(),
  last_event_seq: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type TimeEntry$ = z.infer<typeof timeEntry$>;

/** Pull the flat `rate_*` projection columns into a nested {@link RateSnapshot}. */
function rateFromRow(row: TimeEntry$): RateSnapshot {
  // Cast: `unit` is constrained to RateUnitSchema in the worker, but the
  // projection stores text; we trust the worker to have validated on write.
  return {
    unit: row.rate_unit as RateSnapshot["unit"],
    quantity: row.rate_quantity,
    unitPrice: row.rate_unit_price,
    currency: row.rate_currency,
    netValue: row.rate_net_value,
  };
}

export function timeEntryFromHttp(row: TimeEntry$): TimeEntry {
  return {
    id: row.id,
    contractorId: row.contractor_id,
    clientId: row.client_id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    taskId: row.task_id,
    taskVersion: row.task_version,
    activityId: row.activity_id,
    activityVersion: row.activity_version,
    startedAt: row.started_at,
    stoppedAt: row.stopped_at,
    durationSeconds: row.duration_seconds,
    description: row.description,
    tags: row.tags,
    rateSnapshot: rateFromRow(row),
    isPlaceholder: row.is_placeholder,
    approvalState: row.approval_state,
    approvalDecidedAt: row.approval_decided_at,
    approvalDecidedBy: row.approval_decided_by,
    approvalReason: row.approval_reason,
    splitFromEntryId: row.split_from_entry_id,
    interruptedEntryId: row.interrupted_entry_id,
    resumedFromEntryId: row.resumed_from_entry_id,
    deletedAt: row.deleted_at,
    eventCount: row.event_count,
    lastEventId: row.last_event_id,
    lastEventSeq: row.last_event_seq,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
