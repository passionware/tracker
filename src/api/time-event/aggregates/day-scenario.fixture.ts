/**
 * "Day in the life" event fixture.
 *
 * A deterministic sequence of project + contractor events that exercises the
 * full event shape — task/activity/rate/period_lock setup, timer start, a
 * jump-on interruption, split with gap, description edits, submit, approve.
 *
 * Used by:
 *   - `day-scenario.test.ts`                         — TS reducer replay &
 *                                                      inline-snapshot assertions
 *   - `scripts/projection-equivalence-time.ts`       — SQL trigger replay via
 *                                                      the `append_*_event`
 *                                                      RPCs and equivalence
 *                                                      check against the TS
 *                                                      golden. Runs via
 *                                                      `npm run projection:equivalence:dev`.
 *
 * Because both runners consume the same fixture, any drift between the TS
 * reducers in `contractor-stream.ts` / `project-stream.ts` and the SQL
 * projection functions in `supabase/time_migrations/*.sql` will surface as a
 * diff against the golden snapshot below.
 */

import type {
  ContractorEventPayload,
  ProjectAggregateKind,
  ProjectEventPayload,
  RateDefinition,
  RateSnapshot,
} from "@/api/time-event/time-event.api.ts";

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const FIXTURE_CONTRACTOR_ID = 42;
export const FIXTURE_PROJECT_ID = 7;
export const FIXTURE_CLIENT_ID = 5;
export const FIXTURE_WORKSPACE_ID = 2;
export const FIXTURE_ACTOR_USER_ID = uuid(900);

export const FIXTURE_TASK_A_ID = uuid(101);
export const FIXTURE_TASK_B_ID = uuid(102);
export const FIXTURE_ACTIVITY_DEV_ID = uuid(201);
export const FIXTURE_ACTIVITY_JUMP_ON_ID = uuid(202);
export const FIXTURE_RATE_AGG_ID = uuid(301);
export const FIXTURE_LOCK_ID = uuid(401);

export const FIXTURE_PRIMARY_ENTRY_ID = uuid(501);
export const FIXTURE_JUMP_ON_ENTRY_ID = uuid(502);
export const FIXTURE_SPLIT_LEFT_ID = uuid(503);
export const FIXTURE_SPLIT_RIGHT_ID = uuid(504);

const RATE_DEF: RateDefinition = {
  unit: "h",
  unitPrice: 120,
  currency: "PLN",
  billingUnitPrice: 28,
  billingCurrency: "EUR",
  exchangeRate: 4.3,
};

const RATE_SNAPSHOT: RateSnapshot = { ...RATE_DEF };

export interface ProjectFixtureEvent {
  payload: ProjectEventPayload;
  occurredAt: string;
  aggregateKind: ProjectAggregateKind;
  aggregateId: string;
}

export interface ContractorFixtureEvent {
  payload: ContractorEventPayload;
  occurredAt: string;
}

export const FIXTURE_PROJECT_EVENTS: ReadonlyArray<ProjectFixtureEvent> = [
  {
    payload: {
      type: "TaskCreated",
      taskId: FIXTURE_TASK_A_ID,
      clientId: FIXTURE_CLIENT_ID,
      name: "Refactor login",
      externalLinks: [
        {
          provider: "linear",
          externalId: "ENG-101",
          url: "https://linear.app/acme/issue/ENG-101",
        },
      ],
      assignees: [FIXTURE_CONTRACTOR_ID],
    },
    occurredAt: "2026-04-18T07:30:00Z",
    aggregateKind: "task",
    aggregateId: FIXTURE_TASK_A_ID,
  },
  {
    payload: {
      type: "TaskCreated",
      taskId: FIXTURE_TASK_B_ID,
      clientId: FIXTURE_CLIENT_ID,
      name: "Quick question",
      externalLinks: [],
      assignees: [],
    },
    occurredAt: "2026-04-18T07:31:00Z",
    aggregateKind: "task",
    aggregateId: FIXTURE_TASK_B_ID,
  },
  {
    payload: {
      type: "ActivityCreated",
      activityId: FIXTURE_ACTIVITY_DEV_ID,
      name: "Development",
      kinds: ["development"],
    },
    occurredAt: "2026-04-18T07:32:00Z",
    aggregateKind: "activity",
    aggregateId: FIXTURE_ACTIVITY_DEV_ID,
  },
  {
    payload: {
      type: "ActivityCreated",
      activityId: FIXTURE_ACTIVITY_JUMP_ON_ID,
      name: "Jump on",
      kinds: ["jump_on", "review"],
    },
    occurredAt: "2026-04-18T07:33:00Z",
    aggregateKind: "activity",
    aggregateId: FIXTURE_ACTIVITY_JUMP_ON_ID,
  },
  {
    payload: {
      type: "RateSet",
      rateAggregateId: FIXTURE_RATE_AGG_ID,
      contractorId: FIXTURE_CONTRACTOR_ID,
      effectiveFrom: "2026-04-01",
      rate: RATE_DEF,
    },
    occurredAt: "2026-04-18T07:34:00Z",
    aggregateKind: "rate",
    aggregateId: FIXTURE_RATE_AGG_ID,
  },
  // Closes March for this contractor so backdated starts into March are
  // rejected by the validator. April (the day the scenario takes place) is
  // untouched.
  {
    payload: {
      type: "PeriodLocked",
      lockId: FIXTURE_LOCK_ID,
      contractorId: FIXTURE_CONTRACTOR_ID,
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      lockedAt: "2026-04-01T00:00:00Z",
      lockedByUserId: FIXTURE_ACTOR_USER_ID,
      reason: "March payroll closed",
    },
    occurredAt: "2026-04-01T00:00:00Z",
    aggregateKind: "period_lock",
    aggregateId: FIXTURE_LOCK_ID,
  },
];

export const FIXTURE_CONTRACTOR_EVENTS: ReadonlyArray<ContractorFixtureEvent> =
  [
    // 08:00 — start the primary entry on task A with the dev activity.
    {
      payload: {
        type: "EntryStarted",
        entryId: FIXTURE_PRIMARY_ENTRY_ID,
        clientId: FIXTURE_CLIENT_ID,
        workspaceId: FIXTURE_WORKSPACE_ID,
        projectId: FIXTURE_PROJECT_ID,
        task: { taskId: FIXTURE_TASK_A_ID, taskVersion: 1 },
        activity: { activityId: FIXTURE_ACTIVITY_DEV_ID, activityVersion: 1 },
        startedAt: "2026-04-19T08:00:00Z",
        rate: RATE_SNAPSHOT,
        isPlaceholder: false,
      },
      occurredAt: "2026-04-19T08:00:00Z",
    },
    // 10:30 — stop the primary. One-running-entry invariant: the jump-on
    // below can't start until this Stop has landed. The UI enforces the
    // atomic "stop-then-start" pivot via one correlation id; here we
    // just simulate the two resulting events in order.
    {
      payload: {
        type: "EntryStopped",
        entryId: FIXTURE_PRIMARY_ENTRY_ID,
        stoppedAt: "2026-04-19T10:30:00Z",
      },
      occurredAt: "2026-04-19T10:30:00Z",
    },
    // 10:30 — jump onto task B. `interruptedEntryId` is a pure lineage
    // pointer ("I came from the primary") so the tracker UI can offer a
    // "come back" button on stop. The two entries never overlap.
    {
      payload: {
        type: "EntryStarted",
        entryId: FIXTURE_JUMP_ON_ENTRY_ID,
        clientId: FIXTURE_CLIENT_ID,
        workspaceId: FIXTURE_WORKSPACE_ID,
        projectId: FIXTURE_PROJECT_ID,
        task: { taskId: FIXTURE_TASK_B_ID, taskVersion: 1 },
        activity: {
          activityId: FIXTURE_ACTIVITY_JUMP_ON_ID,
          activityVersion: 1,
        },
        startedAt: "2026-04-19T10:30:00Z",
        rate: RATE_SNAPSHOT,
        isPlaceholder: false,
        interruptedEntryId: FIXTURE_PRIMARY_ENTRY_ID,
      },
      occurredAt: "2026-04-19T10:30:00Z",
    },
    // 11:00 — stop the jump-on.
    {
      payload: {
        type: "EntryStopped",
        entryId: FIXTURE_JUMP_ON_ENTRY_ID,
        stoppedAt: "2026-04-19T11:00:00Z",
      },
      occurredAt: "2026-04-19T11:00:00Z",
    },
    // 10:40 — split the (already stopped) primary at 09:45 with a 10-min
    // coffee gap. Produces two draft children ([08:00, 09:45] and
    // [09:55, 10:30]) and marks the source deleted. Split operates on a
    // stopped entry, so it's perfectly fine to run after the jump-on has
    // started — the two lineages are independent.
    {
      payload: {
        type: "EntrySplit",
        sourceEntryId: FIXTURE_PRIMARY_ENTRY_ID,
        splitAt: "2026-04-19T09:45:00Z",
        gapSeconds: 600,
        leftEntryId: FIXTURE_SPLIT_LEFT_ID,
        rightEntryId: FIXTURE_SPLIT_RIGHT_ID,
      },
      occurredAt: "2026-04-19T11:10:00Z",
    },
    // describe the two splits BEFORE submitting — EntryDescriptionChanged is
    // rejected by the validator once the entry is submitted / approved.
    {
      payload: {
        type: "EntryDescriptionChanged",
        entryId: FIXTURE_SPLIT_LEFT_ID,
        description: "morning focus",
      },
      occurredAt: "2026-04-19T11:11:00Z",
    },
    {
      payload: {
        type: "EntryDescriptionChanged",
        entryId: FIXTURE_SPLIT_RIGHT_ID,
        description: "afternoon wrap",
      },
      occurredAt: "2026-04-19T11:12:00Z",
    },
    {
      payload: {
        type: "TimeSubmittedForApproval",
        entryIds: [
          FIXTURE_SPLIT_LEFT_ID,
          FIXTURE_SPLIT_RIGHT_ID,
          FIXTURE_JUMP_ON_ENTRY_ID,
        ],
        submittedAt: "2026-04-19T11:15:00Z",
      },
      occurredAt: "2026-04-19T11:15:00Z",
    },
    {
      payload: {
        type: "TimeApproved",
        entryIds: [
          FIXTURE_SPLIT_LEFT_ID,
          FIXTURE_SPLIT_RIGHT_ID,
          FIXTURE_JUMP_ON_ENTRY_ID,
        ],
        approvedAt: "2026-04-19T11:30:00Z",
        approverUserId: FIXTURE_ACTOR_USER_ID,
      },
      occurredAt: "2026-04-19T11:30:00Z",
    },
  ];
