import type {
  ContractorEventEnvelope,
  ContractorEventPayload,
  RateSnapshot,
} from "@/api/time-event/time-event.api.ts";
import { EVENT_VERSION_V1 } from "@/api/time-event/time-event.api.ts";

/**
 * Mint a UUID v4 — uses `crypto.randomUUID()` when available (browsers,
 * modern Node), falls back to a Math.random hex shape that satisfies the
 * Zod uuid schema in the rare case a polyfill is missing (e.g. very old
 * Safari WebView). The fallback is *not* cryptographically random; it's
 * good enough as an idempotency key but we'd never use it for security.
 */
export function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Tracker commands always carry a single `correlationId` per UI gesture
 * (e.g. clicking Stop emits one `EntryStopped`; if it later emits a
 * follow-up `TimeSubmittedForApproval` they share this id so audit replay
 * shows them as one chain). Callers create this once at the top of the
 * gesture and feed it to every {@link buildContractorEnvelope}.
 */
export interface TrackerCommandContext {
  contractorId: number;
  correlationId: string;
  /** ISO timestamp the command "occurred at" — defaults to "now". */
  occurredAt?: string;
}

export function buildContractorEnvelope(
  ctx: TrackerCommandContext,
): ContractorEventEnvelope {
  return {
    clientEventId: newUuid(),
    correlationId: ctx.correlationId,
    eventVersion: EVENT_VERSION_V1,
    occurredAt: ctx.occurredAt ?? new Date().toISOString(),
    contractorId: ctx.contractorId,
  };
}

export interface StartEntryCommand {
  entryId?: string;
  workspaceId: number;
  clientId: number;
  projectId: number;
  rate: RateSnapshot;
  task?: { taskId: string; taskVersion: number };
  activity?: { activityId: string; activityVersion: number };
  description?: string;
  tags?: string[];
  /**
   * `true` when neither `task` nor `activity` is provided yet — the worker
   * will project the entry with `is_placeholder=true` so the UI can flag it
   * as needing detail later. When `false`, both task and activity must be
   * present (the schema enforces this).
   */
  isPlaceholder: boolean;
  /** Jump-on lineage. */
  interruptedEntryId?: string;
  resumedFromEntryId?: string;
  startedAt?: string;
}

export function buildEntryStartedPayload(
  cmd: StartEntryCommand,
): ContractorEventPayload {
  return {
    type: "EntryStarted",
    entryId: cmd.entryId ?? newUuid(),
    clientId: cmd.clientId,
    workspaceId: cmd.workspaceId,
    projectId: cmd.projectId,
    task: cmd.task,
    activity: cmd.activity,
    startedAt: cmd.startedAt ?? new Date().toISOString(),
    description: cmd.description,
    tags: cmd.tags,
    rate: cmd.rate,
    isPlaceholder: cmd.isPlaceholder,
    interruptedEntryId: cmd.interruptedEntryId,
    resumedFromEntryId: cmd.resumedFromEntryId,
  };
}

export function buildEntryStoppedPayload(
  entryId: string,
  stoppedAt = new Date().toISOString(),
): ContractorEventPayload {
  return { type: "EntryStopped", entryId, stoppedAt };
}

export function buildSubmitForApprovalPayload(
  entryIds: ReadonlyArray<string>,
  note?: string,
  submittedAt = new Date().toISOString(),
): ContractorEventPayload {
  return {
    type: "TimeSubmittedForApproval",
    entryIds: [...entryIds],
    submittedAt,
    note,
  };
}

/**
 * "Best-effort" rate snapshot for placeholder entries when the user has no
 * configured `rate_current` row yet. The rate fields are required by the
 * schema; using a zero-valued snapshot lets us still record presence/time
 * while signalling "needs detail" via `isPlaceholder=true`. The worker /
 * EntryEditor will let admins re-snapshot the rate later.
 */
export const PLACEHOLDER_RATE: RateSnapshot = {
  unit: "h",
  unitPrice: 0,
  currency: "PLN",
  billingUnitPrice: 0,
  billingCurrency: "PLN",
  exchangeRate: 1,
};
