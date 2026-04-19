/**
 * Contractor stream event payloads.
 *
 * One stream per contractor. Each event below is the *payload* of a row in
 * `time_*.contractor_event`; the row itself also has `seq`, `actor_user_id`,
 * `received_at`, `event_id`, plus the envelope fields from
 * `event-envelope.schema.ts`.
 *
 * Modelled as a Zod discriminated union on `type`. Add a new event by
 * adding a new variant — never mutate an existing one (bump
 * `eventVersion` on the envelope or define `EntryFooV2` as a new type).
 *
 * Pure Zod, no I/O, safe in workers.
 */

import { z } from "zod";
import {
  contractorEventEnvelopeSchema,
} from "@/api/time-event/event-envelope.schema.ts";
import {
  rateSnapshotSchema,
} from "@/api/time-event/rate-snapshot.schema.ts";

const uuidSchema = z.string().uuid();
const isoTimestampSchema = z
  .string()
  .datetime({ offset: true, message: "expected RFC 3339 timestamp" });

// ---------------------------------------------------------------------------
// Shared sub-schemas
// ---------------------------------------------------------------------------

const positiveBigIntId = z.number().int().positive();

/**
 * Tag list applied to an entry. Lower-cased, slug-ish, deduped at the
 * schema layer so projection lookups are consistent. We keep the cap
 * deliberately low to discourage misuse.
 */
const tagsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(40)
      .regex(/^[a-z0-9][a-z0-9_-]*$/i, "tags must be slug-like"),
  )
  .max(16, "at most 16 tags per entry")
  .transform((arr) => Array.from(new Set(arr.map((t) => t.toLowerCase()))));

const taskRefSchema = z.object({
  taskId: uuidSchema,
  /** Aggregate version of the task at snapshot time. */
  taskVersion: z.number().int().nonnegative(),
});

const activityRefSchema = z.object({
  activityId: uuidSchema,
  /** Aggregate version of the activity at snapshot time. */
  activityVersion: z.number().int().nonnegative(),
});

// ---------------------------------------------------------------------------
// Payload variants
// ---------------------------------------------------------------------------

/**
 * EntryStarted — open a new entry. The Worker enforces the
 * "one running timer per contractor (or per contractor + jump-on lane)"
 * policy here; it can also coerce `startedAt` to "now" if it's too far in
 * the future.
 *
 * Placeholder rule: when `isPlaceholder = true`, both `task` and `activity`
 * may be omitted. Otherwise both must be present.
 */
const entryStartedPayloadSchema = z.object({
  type: z.literal("EntryStarted"),
  entryId: uuidSchema,

  clientId: positiveBigIntId,
  workspaceId: positiveBigIntId,
  projectId: positiveBigIntId,

  task: taskRefSchema.optional(),
  activity: activityRefSchema.optional(),

  startedAt: isoTimestampSchema,
  description: z.string().trim().max(2000).optional(),
  tags: tagsSchema.optional(),

  /** Snapshot of the contractor's rate for this project at start time. */
  rate: rateSnapshotSchema,

  isPlaceholder: z.boolean().default(false),

  /**
   * Jump-on lineage. When this entry is a "jump-on" interrupting another
   * task, `interruptedEntryId` points at the entry the contractor expects
   * to come back to. The matching `EntryStarted` for the resumed entry
   * later carries `resumedFromEntryId = thisEntryId`.
   */
  interruptedEntryId: uuidSchema.optional(),
  resumedFromEntryId: uuidSchema.optional(),
});
// Placeholder consistency rule (non-placeholder entries must carry both task
// and activity) is applied below as a superRefine on the discriminated union;
// `z.discriminatedUnion` cannot accept refined variants.

/** EntryStopped — close an open entry. */
const entryStoppedPayloadSchema = z.object({
  type: z.literal("EntryStopped"),
  entryId: uuidSchema,
  stoppedAt: isoTimestampSchema,
});

/** EntryDescriptionChanged — edit free-text description. */
const entryDescriptionChangedPayloadSchema = z.object({
  type: z.literal("EntryDescriptionChanged"),
  entryId: uuidSchema,
  description: z.string().trim().max(2000).nullable(),
});

/** EntryTaskAssigned — fill or change the task on an entry (often used to
 * resolve placeholders). Always paired with an activity to keep the projection
 * consistent. */
const entryTaskAssignedPayloadSchema = z.object({
  type: z.literal("EntryTaskAssigned"),
  entryId: uuidSchema,
  task: taskRefSchema,
  activity: activityRefSchema,
});

/** EntryActivityAssigned — change only the activity. */
const entryActivityAssignedPayloadSchema = z.object({
  type: z.literal("EntryActivityAssigned"),
  entryId: uuidSchema,
  activity: activityRefSchema,
});

/** EntryClientChanged — re-route an entry to a different client/workspace. */
const entryRoutingChangedPayloadSchema = z.object({
  type: z.literal("EntryRoutingChanged"),
  entryId: uuidSchema,
  clientId: positiveBigIntId,
  workspaceId: positiveBigIntId,
  projectId: positiveBigIntId,
});

/** EntryDeleted — soft delete; the row stays in the projection with
 * `deleted_at` set so it can still be referenced by exports/lineage. */
const entryDeletedPayloadSchema = z.object({
  type: z.literal("EntryDeleted"),
  entryId: uuidSchema,
  reason: z.string().trim().max(500).optional(),
});

/**
 * EntrySplit — split one entry into two with an optional gap (the original
 * use case for "breaks"). Both new entries inherit project/client/workspace/
 * task/activity/rate from the source.
 *
 *   source:  [-------- A --------]
 *   split:   [-- A1 --]  gap   [-- A2 --]
 *                       ^^^      ^^^
 *                       gapSeconds excluded entirely
 *
 * Constraint: `splitAt + gapSeconds ≤ source.stoppedAt`. The Worker validates.
 */
const entrySplitPayloadSchema = z.object({
  type: z.literal("EntrySplit"),
  sourceEntryId: uuidSchema,
  /** Wall-clock moment to cut at (becomes A1.stoppedAt). */
  splitAt: isoTimestampSchema,
  /** Seconds to discard between A1 and A2 (≥ 0). */
  gapSeconds: z.number().int().nonnegative().default(0),
  /** Client-generated UUIDs for the two resulting entries. */
  leftEntryId: uuidSchema,
  rightEntryId: uuidSchema,
});

/**
 * EntryMerged — fuse two adjacent entries into one. The Worker enforces that
 * both source entries share project/client/workspace/task/activity/rate.
 */
const entryMergedPayloadSchema = z.object({
  type: z.literal("EntryMerged"),
  leftEntryId: uuidSchema,
  rightEntryId: uuidSchema,
  /** Client-generated UUID of the resulting entry. */
  mergedEntryId: uuidSchema,
});

/**
 * EntryRateSnapshotted — re-snapshot the rate (e.g. after the project rate
 * changed and the contractor wants to apply the new rate retroactively).
 * Rare; used by admin tooling.
 */
const entryRateSnapshottedPayloadSchema = z.object({
  type: z.literal("EntryRateSnapshotted"),
  entryId: uuidSchema,
  rate: rateSnapshotSchema,
});

/** EntryTagsChanged — replace the entry's tag set. */
const entryTagsChangedPayloadSchema = z.object({
  type: z.literal("EntryTagsChanged"),
  entryId: uuidSchema,
  tags: tagsSchema,
});

// ----- Approval flow -----

const approvalEntriesSchema = z
  .array(uuidSchema)
  .min(1, "at least one entry must be in the batch")
  .max(500, "at most 500 entries per approval batch");

/** TimeSubmittedForApproval — contractor submits a batch of entries. */
const timeSubmittedForApprovalPayloadSchema = z.object({
  type: z.literal("TimeSubmittedForApproval"),
  entryIds: approvalEntriesSchema,
  submittedAt: isoTimestampSchema,
  note: z.string().trim().max(500).optional(),
});

/** TimeApproved — admin approves a batch. */
const timeApprovedPayloadSchema = z.object({
  type: z.literal("TimeApproved"),
  entryIds: approvalEntriesSchema,
  approvedAt: isoTimestampSchema,
  approverUserId: uuidSchema,
  note: z.string().trim().max(500).optional(),
});

/** TimeRejected — admin rejects a batch with mandatory reason. */
const timeRejectedPayloadSchema = z.object({
  type: z.literal("TimeRejected"),
  entryIds: approvalEntriesSchema,
  rejectedAt: isoTimestampSchema,
  rejectedByUserId: uuidSchema,
  reason: z.string().trim().min(1, "reason required").max(2000),
});

/** EntryRevertedToDraft — undo a submission/approval (admin or owner). */
const entryRevertedToDraftPayloadSchema = z.object({
  type: z.literal("EntryRevertedToDraft"),
  entryId: uuidSchema,
  revertedAt: isoTimestampSchema,
  revertedByUserId: uuidSchema,
  reason: z.string().trim().max(2000).optional(),
});

// ----- Imports / backfill -----

/**
 * EntryImportedFromTmetric — admin-triggered backfill. Carries the full
 * shape of a started+stopped entry plus the originating tmetric id for
 * traceability and dedup.
 */
const entryImportedFromTmetricPayloadSchema = z.object({
  type: z.literal("EntryImportedFromTmetric"),
  entryId: uuidSchema,
  tmetricEntryId: z.string().min(1).max(64),

  clientId: positiveBigIntId,
  workspaceId: positiveBigIntId,
  projectId: positiveBigIntId,
  task: taskRefSchema.optional(),
  activity: activityRefSchema.optional(),

  startedAt: isoTimestampSchema,
  stoppedAt: isoTimestampSchema,
  description: z.string().trim().max(2000).optional(),
  tags: tagsSchema.optional(),
  rate: rateSnapshotSchema,
  isPlaceholder: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

/**
 * Bare discriminated union (no cross-field rules). Useful when you only need
 * shape-level parsing — e.g. an offline-queue entry that has already been
 * validated upstream.
 */
export const contractorEventPayloadBaseSchema = z.discriminatedUnion("type", [
  entryStartedPayloadSchema,
  entryStoppedPayloadSchema,
  entryDescriptionChangedPayloadSchema,
  entryTaskAssignedPayloadSchema,
  entryActivityAssignedPayloadSchema,
  entryRoutingChangedPayloadSchema,
  entryDeletedPayloadSchema,
  entrySplitPayloadSchema,
  entryMergedPayloadSchema,
  entryRateSnapshottedPayloadSchema,
  entryTagsChangedPayloadSchema,
  timeSubmittedForApprovalPayloadSchema,
  timeApprovedPayloadSchema,
  timeRejectedPayloadSchema,
  entryRevertedToDraftPayloadSchema,
  entryImportedFromTmetricPayloadSchema,
]);

/**
 * Full payload schema with cross-field rules layered on top. Use this at any
 * trust boundary (Worker ingress, frontend command construction, IndexedDB
 * read).
 *
 * `discriminatedUnion` rejects refined variants, so any rule that spans
 * multiple fields of one variant is hoisted into the `superRefine` below.
 */
export const contractorEventPayloadSchema =
  contractorEventPayloadBaseSchema.superRefine((payload, ctx) => {
    switch (payload.type) {
      case "EntryStarted": {
        if (
          !payload.isPlaceholder &&
          (payload.task === undefined || payload.activity === undefined)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["task"],
            message: "non-placeholder entries must specify both task and activity",
          });
        }
        return;
      }
      case "EntrySplit": {
        if (payload.leftEntryId === payload.rightEntryId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["rightEntryId"],
            message: "leftEntryId and rightEntryId must differ",
          });
        }
        return;
      }
      case "EntryMerged": {
        const all = [
          payload.leftEntryId,
          payload.rightEntryId,
          payload.mergedEntryId,
        ];
        if (new Set(all).size !== all.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["mergedEntryId"],
            message: "leftEntryId / rightEntryId / mergedEntryId must all differ",
          });
        }
        return;
      }
      case "EntryImportedFromTmetric": {
        if (
          !payload.isPlaceholder &&
          (payload.task === undefined || payload.activity === undefined)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["task"],
            message:
              "imported non-placeholder entries must specify both task and activity",
          });
        }
        if (payload.startedAt >= payload.stoppedAt) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["stoppedAt"],
            message: "stoppedAt must be > startedAt",
          });
        }
        return;
      }
      default:
        return;
    }
  });

export type ContractorEventPayload = z.infer<typeof contractorEventPayloadSchema>;
export type ContractorEventType = ContractorEventPayload["type"];

/**
 * Full client→server submission shape: envelope + payload.
 */
export const contractorEventSchema = z
  .object({
    envelope: contractorEventEnvelopeSchema,
    payload: contractorEventPayloadSchema,
  });

export type ContractorEvent = z.infer<typeof contractorEventSchema>;

/**
 * Helper for tests: extract a specific event variant by `type`.
 */
export type ContractorEventOf<T extends ContractorEventType> = Extract<
  ContractorEventPayload,
  { type: T }
>;
