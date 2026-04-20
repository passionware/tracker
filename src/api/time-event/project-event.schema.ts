/**
 * Project stream event payloads.
 *
 * One stream per project, holding 4 aggregate kinds:
 *   - `task`        — task lifecycle (create, rename, link, assign, estimate,
 *                     complete, reopen, archive)
 *   - `activity`    — activity definitions (development, meeting, jump-on…)
 *   - `rate`        — per-project + per-contractor rate cards
 *   - `period_lock` — admin month-close locks
 *
 * Each event below is the *payload* of a row in `time_*.project_event`. The
 * envelope (in `event-envelope.schema.ts`) carries `projectId`,
 * `aggregateKind`, `aggregateId` and the optimistic-concurrency token used to
 * fence per-aggregate writes inside the project stream.
 *
 * Pure Zod, no I/O, safe in workers.
 */

import { z } from "zod";
import {
  projectEventEnvelopeSchema,
} from "@/api/time-event/event-envelope.schema.ts";
import {
  rateDefinitionSchema,
} from "@/api/time-event/rate-snapshot.schema.ts";

const uuidSchema = z.string().uuid();
const isoTimestampSchema = z
  .string()
  .datetime({ offset: true, message: "expected RFC 3339 timestamp" });
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD calendar date");

const positiveBigIntId = z.number().int().positive();

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

/**
 * External link on a task. We accept a small set of providers explicitly so
 * the UI can render branded chips, plus a free-form `other` kind.
 */
export const externalLinkProviderSchema = z.enum([
  "linear",
  "gitlab",
  "bitbucket",
  "github",
  "jira",
  "other",
]);

export type ExternalLinkProvider = z.infer<typeof externalLinkProviderSchema>;

const externalLinkSchema = z.object({
  provider: externalLinkProviderSchema,
  /** Provider-native id, e.g. Linear "ENG-123" or a git branch name. */
  externalId: z.string().trim().min(1).max(200),
  /** Canonical URL to open the resource. */
  url: z.string().url().max(2048),
  /** Optional free-form label override; UI falls back to `externalId`. */
  label: z.string().trim().max(200).optional(),
});

export type ExternalLink = z.infer<typeof externalLinkSchema>;

/** Estimate pair — both quantity AND unit must be set together (or both unset). */
const estimateSchema = z.object({
  quantity: z.number().nonnegative().finite(),
  unit: z.string().trim().min(1).max(16),
});

// ---------------------------------------------------------------------------
// TASK aggregate
// ---------------------------------------------------------------------------

const taskCreatedPayloadSchema = z.object({
  type: z.literal("TaskCreated"),
  /** Must equal `envelope.aggregateId` (Worker enforces). */
  taskId: uuidSchema,
  /** Tasks are scoped to a project but live under a client (a contractor
   * may report time on the same task via different workspaces). */
  clientId: positiveBigIntId,
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10_000).optional(),
  externalLinks: z.array(externalLinkSchema).max(20).default([]),
  /**
   * Initial assignees as `contractor.id` (bigints). May be empty.
   * Mapping a Supabase auth user back to a contractor id is the admin's job;
   * see `contractor.auth_user_id`. We deliberately do NOT key on auth uids
   * so contractors can exist (and own task history) before they ever log in.
   */
  assignees: z.array(positiveBigIntId).max(50).default([]),
  estimate: estimateSchema.optional(),
});

const taskRenamedPayloadSchema = z.object({
  type: z.literal("TaskRenamed"),
  taskId: uuidSchema,
  name: z.string().trim().min(1).max(200),
});

const taskDescriptionChangedPayloadSchema = z.object({
  type: z.literal("TaskDescriptionChanged"),
  taskId: uuidSchema,
  description: z.string().trim().max(10_000).nullable(),
});

const taskExternalLinkAddedPayloadSchema = z.object({
  type: z.literal("TaskExternalLinkAdded"),
  taskId: uuidSchema,
  link: externalLinkSchema,
});

const taskExternalLinkRemovedPayloadSchema = z.object({
  type: z.literal("TaskExternalLinkRemoved"),
  taskId: uuidSchema,
  /** Identify the link by `provider + externalId`. */
  provider: externalLinkProviderSchema,
  externalId: z.string().trim().min(1).max(200),
});

const taskAssignedPayloadSchema = z.object({
  type: z.literal("TaskAssigned"),
  taskId: uuidSchema,
  /** `contractor.id` (bigint), not an auth uid — see `TaskCreated.assignees`. */
  contractorId: positiveBigIntId,
});

const taskUnassignedPayloadSchema = z.object({
  type: z.literal("TaskUnassigned"),
  taskId: uuidSchema,
  /** `contractor.id` (bigint), not an auth uid — see `TaskCreated.assignees`. */
  contractorId: positiveBigIntId,
});

const taskEstimateSetPayloadSchema = z.object({
  type: z.literal("TaskEstimateSet"),
  taskId: uuidSchema,
  /** `null` clears the estimate; otherwise quantity + unit must both be set. */
  estimate: estimateSchema.nullable(),
});

const taskCompletedPayloadSchema = z.object({
  type: z.literal("TaskCompleted"),
  taskId: uuidSchema,
  completedAt: isoTimestampSchema,
  completedByUserId: uuidSchema,
});

const taskReopenedPayloadSchema = z.object({
  type: z.literal("TaskReopened"),
  taskId: uuidSchema,
  reopenedAt: isoTimestampSchema,
  reopenedByUserId: uuidSchema,
});

const taskArchivedPayloadSchema = z.object({
  type: z.literal("TaskArchived"),
  taskId: uuidSchema,
});

const taskUnarchivedPayloadSchema = z.object({
  type: z.literal("TaskUnarchived"),
  taskId: uuidSchema,
});

// ---------------------------------------------------------------------------
// ACTIVITY aggregate
// ---------------------------------------------------------------------------

/**
 * Activity classification kinds. Free-form strings — the schema accepts any
 * non-empty token — but the frontend treats these well-known ones specially:
 *   - "development"
 *   - "meeting"
 *   - "code_review"
 *   - "analysis"
 *   - "jump_on"      (mentoring/help interruptions)
 *   - "review"
 *   - "admin"
 *
 * Multiple kinds per activity are allowed (an activity can be both a
 * `meeting` and a `jump_on`).
 */
const activityKindSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9][a-z0-9_]*$/i, "kinds must be slug-like");

const activityKindsSchema = z
  .array(activityKindSchema)
  .max(10)
  .transform((arr) => Array.from(new Set(arr.map((k) => k.toLowerCase()))));

const activityCreatedPayloadSchema = z.object({
  type: z.literal("ActivityCreated"),
  activityId: uuidSchema,
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  kinds: activityKindsSchema.default([]),
});

const activityRenamedPayloadSchema = z.object({
  type: z.literal("ActivityRenamed"),
  activityId: uuidSchema,
  name: z.string().trim().min(1).max(200),
});

const activityDescriptionChangedPayloadSchema = z.object({
  type: z.literal("ActivityDescriptionChanged"),
  activityId: uuidSchema,
  description: z.string().trim().max(2000).nullable(),
});

const activityKindsChangedPayloadSchema = z.object({
  type: z.literal("ActivityKindsChanged"),
  activityId: uuidSchema,
  kinds: activityKindsSchema,
});

const activityArchivedPayloadSchema = z.object({
  type: z.literal("ActivityArchived"),
  activityId: uuidSchema,
});

const activityUnarchivedPayloadSchema = z.object({
  type: z.literal("ActivityUnarchived"),
  activityId: uuidSchema,
});

// ---------------------------------------------------------------------------
// RATE aggregate
// ---------------------------------------------------------------------------

/**
 * RateSet — declare/replace the per-(project, contractor) rate effective from
 * a calendar date. The rate aggregate is keyed in the projection by
 * `(projectId, contractorId)` — the `aggregateId` UUID on the envelope is a
 * stable surrogate for that pair.
 */
const rateSetPayloadSchema = z.object({
  type: z.literal("RateSet"),
  rateAggregateId: uuidSchema,
  contractorId: positiveBigIntId,
  /** Effective from this calendar date (inclusive). */
  effectiveFrom: isoDateSchema,
  rate: rateDefinitionSchema,
});

/** RateUnset — retire the rate (no entries can snapshot it after this). */
const rateUnsetPayloadSchema = z.object({
  type: z.literal("RateUnset"),
  rateAggregateId: uuidSchema,
  /** Effective from this calendar date (inclusive). */
  effectiveFrom: isoDateSchema,
});

// ---------------------------------------------------------------------------
// PERIOD LOCK aggregate
// ---------------------------------------------------------------------------

/**
 * PeriodLocked — admin closes a month (or arbitrary range). Affects all
 * contractors when `contractorId` is omitted, otherwise only the named one.
 * The Worker rejects any contractor event whose `occurredAt` falls within an
 * active lock for the relevant `(projectId, contractorId?)`.
 */
const periodLockedPayloadSchema = z.object({
  type: z.literal("PeriodLocked"),
  lockId: uuidSchema,
  /** Optional — null means "all contractors on this project". */
  contractorId: positiveBigIntId.nullable(),
  periodStart: isoDateSchema,
  periodEnd: isoDateSchema,
  lockedAt: isoTimestampSchema,
  lockedByUserId: uuidSchema,
  reason: z.string().trim().max(500).optional(),
});
// `periodStart <= periodEnd` is enforced via superRefine on the union below.

const periodUnlockedPayloadSchema = z.object({
  type: z.literal("PeriodUnlocked"),
  lockId: uuidSchema,
  unlockedAt: isoTimestampSchema,
  unlockedByUserId: uuidSchema,
  reason: z.string().trim().max(500).optional(),
});

// ---------------------------------------------------------------------------
// Per-aggregate-kind discriminated unions
// ---------------------------------------------------------------------------

export const taskEventPayloadSchema = z.discriminatedUnion("type", [
  taskCreatedPayloadSchema,
  taskRenamedPayloadSchema,
  taskDescriptionChangedPayloadSchema,
  taskExternalLinkAddedPayloadSchema,
  taskExternalLinkRemovedPayloadSchema,
  taskAssignedPayloadSchema,
  taskUnassignedPayloadSchema,
  taskEstimateSetPayloadSchema,
  taskCompletedPayloadSchema,
  taskReopenedPayloadSchema,
  taskArchivedPayloadSchema,
  taskUnarchivedPayloadSchema,
]);

export const activityEventPayloadSchema = z.discriminatedUnion("type", [
  activityCreatedPayloadSchema,
  activityRenamedPayloadSchema,
  activityDescriptionChangedPayloadSchema,
  activityKindsChangedPayloadSchema,
  activityArchivedPayloadSchema,
  activityUnarchivedPayloadSchema,
]);

export const rateEventPayloadSchema = z.discriminatedUnion("type", [
  rateSetPayloadSchema,
  rateUnsetPayloadSchema,
]);

export const periodLockEventPayloadSchema = z.discriminatedUnion("type", [
  periodLockedPayloadSchema,
  periodUnlockedPayloadSchema,
]);

// ---------------------------------------------------------------------------
// Stream-wide discriminated union
// ---------------------------------------------------------------------------

/**
 * Bare union of all project events across all aggregate kinds — no
 * cross-field rules. The Worker uses the envelope's `aggregateKind` to pick
 * the per-kind reducer; this union exists so the frontend offline queue can
 * store a heterogeneous list.
 */
export const projectEventPayloadBaseSchema = z.discriminatedUnion("type", [
  ...taskEventPayloadSchema.options,
  ...activityEventPayloadSchema.options,
  ...rateEventPayloadSchema.options,
  ...periodLockEventPayloadSchema.options,
]);

/**
 * Full payload schema with cross-field rules layered on top. Use this at any
 * trust boundary (Worker ingress, frontend command construction, IndexedDB
 * read).
 */
export const projectEventPayloadSchema = projectEventPayloadBaseSchema
  .superRefine((payload, ctx) => {
    switch (payload.type) {
      case "PeriodLocked": {
        if (payload.periodStart > payload.periodEnd) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["periodEnd"],
            message: "periodStart must be ≤ periodEnd",
          });
        }
        return;
      }
      default:
        return;
    }
  });

export type ProjectEventPayload = z.infer<typeof projectEventPayloadSchema>;
export type ProjectEventType = ProjectEventPayload["type"];

export type TaskEventPayload = z.infer<typeof taskEventPayloadSchema>;
export type ActivityEventPayload = z.infer<typeof activityEventPayloadSchema>;
export type RateEventPayload = z.infer<typeof rateEventPayloadSchema>;
export type PeriodLockEventPayload = z.infer<typeof periodLockEventPayloadSchema>;

/**
 * Full client→server submission shape: envelope + payload.
 */
export const projectEventSchema = z.object({
  envelope: projectEventEnvelopeSchema,
  payload: projectEventPayloadSchema,
});

export type ProjectEvent = z.infer<typeof projectEventSchema>;

/**
 * Helper for tests: extract a specific event variant by `type`.
 */
export type ProjectEventOf<T extends ProjectEventType> = Extract<
  ProjectEventPayload,
  { type: T }
>;
