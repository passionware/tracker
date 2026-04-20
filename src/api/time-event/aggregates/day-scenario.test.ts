/**
 * End-to-end scenario test: replay the "day in the life" fixture through both
 * reducers and assert the resulting projection-equivalent state.
 *
 * Complements the per-case unit tests in `contractor-stream.test.ts` and
 * `project-stream.test.ts` by exercising a realistic multi-event sequence:
 * start, jump-on, stop, stop, split with gap, describe, submit, approve.
 *
 * The `projectionFromContractorState` helper at the bottom derives the shape
 * SQL's `time.entry` projection is expected to produce — the inline snapshot
 * is the golden oracle the SQL↔TS equivalence CLI will diff against once it
 * lands.
 */

import { describe, expect, it } from "vitest";
import {
  replayContractorStream,
  validateContractorEvent,
  type ContractorStreamState,
} from "@/api/time-event/aggregates/contractor-stream.ts";
import {
  isPeriodLockedAt,
  replayProjectStream,
} from "@/api/time-event/aggregates/project-stream.ts";
import {
  FIXTURE_ACTIVITY_DEV_ID,
  FIXTURE_ACTIVITY_JUMP_ON_ID,
  FIXTURE_ACTOR_USER_ID,
  FIXTURE_CLIENT_ID,
  FIXTURE_CONTRACTOR_EVENTS,
  FIXTURE_CONTRACTOR_ID,
  FIXTURE_JUMP_ON_ENTRY_ID,
  FIXTURE_LOCK_ID,
  FIXTURE_PRIMARY_ENTRY_ID,
  FIXTURE_PROJECT_EVENTS,
  FIXTURE_PROJECT_ID,
  FIXTURE_RATE_AGG_ID,
  FIXTURE_SPLIT_LEFT_ID,
  FIXTURE_SPLIT_RIGHT_ID,
  FIXTURE_TASK_A_ID,
  FIXTURE_TASK_B_ID,
  FIXTURE_WORKSPACE_ID,
} from "./day-scenario.fixture.ts";

describe("day-in-the-life scenario — project + contractor streams", () => {
  const projectState = replayProjectStream(
    FIXTURE_PROJECT_ID,
    FIXTURE_PROJECT_EVENTS,
  );
  const contractorState = replayContractorStream(
    FIXTURE_CONTRACTOR_ID,
    FIXTURE_CONTRACTOR_EVENTS,
  );

  it("project state has the expected tasks, activities, rates, locks", () => {
    expect(Object.keys(projectState.tasks)).toHaveLength(2);
    expect(projectState.tasks[FIXTURE_TASK_A_ID]).toMatchObject({
      name: "Refactor login",
      externalLinks: [
        {
          provider: "linear",
          externalId: "ENG-101",
          url: "https://linear.app/acme/issue/ENG-101",
        },
      ],
      assignees: [FIXTURE_CONTRACTOR_ID],
      version: 1,
    });
    expect(projectState.tasks[FIXTURE_TASK_B_ID]).toMatchObject({
      name: "Quick question",
      externalLinks: [],
      assignees: [],
    });

    expect(projectState.activities[FIXTURE_ACTIVITY_DEV_ID].kinds).toEqual([
      "development",
    ]);
    expect(projectState.activities[FIXTURE_ACTIVITY_JUMP_ON_ID].kinds).toEqual([
      "jump_on",
      "review",
    ]);

    expect(projectState.rates[FIXTURE_RATE_AGG_ID]).toMatchObject({
      isActive: true,
      contractorId: FIXTURE_CONTRACTOR_ID,
      current: { unitPrice: 120, currency: "PLN" },
    });

    expect(projectState.periodLocks[FIXTURE_LOCK_ID]).toMatchObject({
      contractorId: FIXTURE_CONTRACTOR_ID,
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      unlockedAt: null,
    });
  });

  it("period lock blocks March starts, allows April starts", () => {
    expect(
      isPeriodLockedAt(projectState, {
        projectId: FIXTURE_PROJECT_ID,
        contractorId: FIXTURE_CONTRACTOR_ID,
        occurredAt: "2026-03-15T09:00:00Z",
      }),
    ).toBe(true);
    expect(
      isPeriodLockedAt(projectState, {
        projectId: FIXTURE_PROJECT_ID,
        contractorId: FIXTURE_CONTRACTOR_ID,
        occurredAt: "2026-04-19T09:00:00Z",
      }),
    ).toBe(false);
  });

  it("primary entry is split + marked deleted; two children are approved", () => {
    const primary = contractorState.entries[FIXTURE_PRIMARY_ENTRY_ID];
    expect(primary).toBeDefined();
    expect(primary.deletedAt).not.toBeNull();

    const left = contractorState.entries[FIXTURE_SPLIT_LEFT_ID];
    const right = contractorState.entries[FIXTURE_SPLIT_RIGHT_ID];

    expect(left.startedAt).toBe("2026-04-19T08:00:00Z");
    expect(left.stoppedAt).toBe("2026-04-19T09:45:00Z");
    expect(right.startedAt).toBe("2026-04-19T09:55:00.000Z");
    expect(right.stoppedAt).toBe("2026-04-19T10:30:00Z");

    expect(left.description).toBe("morning focus");
    expect(right.description).toBe("afternoon wrap");

    expect(left.lineage).toEqual([
      {
        kind: "split",
        sourceEntryIds: [FIXTURE_PRIMARY_ENTRY_ID],
        extra: { side: "left", gapSeconds: 600 },
      },
    ]);
    expect(right.lineage).toEqual([
      {
        kind: "split",
        sourceEntryIds: [FIXTURE_PRIMARY_ENTRY_ID],
        extra: { side: "right", gapSeconds: 600 },
      },
    ]);

    expect(left.approvalState).toBe("approved");
    expect(right.approvalState).toBe("approved");
  });

  it("jump-on entry links back to primary and is approved", () => {
    const jumpOn = contractorState.entries[FIXTURE_JUMP_ON_ENTRY_ID];
    expect(jumpOn).toBeDefined();
    // `interruptedEntryId` is a lineage pointer only — the primary was
    // stopped before the jump-on started (one-running-entry invariant).
    expect(jumpOn.interruptedEntryId).toBe(FIXTURE_PRIMARY_ENTRY_ID);
    expect(jumpOn.startedAt).toBe("2026-04-19T10:30:00Z");
    expect(jumpOn.stoppedAt).toBe("2026-04-19T11:00:00Z");
    expect(jumpOn.approvalState).toBe("approved");
    // The jump-on is routed to the same project but a different task.
    expect(jumpOn.taskId).toBe(FIXTURE_TASK_B_ID);
    // Primary was already stopped by the time the jump-on started.
    const primary = contractorState.entries[FIXTURE_PRIMARY_ENTRY_ID];
    expect(primary.stoppedAt).toBe("2026-04-19T10:30:00Z");
    expect(Date.parse(primary.stoppedAt!)).toBeLessThanOrEqual(
      Date.parse(jumpOn.startedAt),
    );
  });

  it("cross-stream: validator rejects a new start inside the locked March window", () => {
    const rate = projectState.rates[FIXTURE_RATE_AGG_ID].current;
    const r = validateContractorEvent(
      contractorState,
      {
        type: "EntryStarted",
        entryId: "00000000-0000-4000-8000-000000000999",
        clientId: FIXTURE_CLIENT_ID,
        workspaceId: FIXTURE_WORKSPACE_ID,
        projectId: FIXTURE_PROJECT_ID,
        task: { taskId: FIXTURE_TASK_A_ID, taskVersion: 1 },
        activity: {
          activityId: FIXTURE_ACTIVITY_DEV_ID,
          activityVersion: 1,
        },
        startedAt: "2026-03-15T09:00:00Z",
        rate,
        isPlaceholder: false,
      },
      {
        actorUserId: FIXTURE_ACTOR_USER_ID,
        now: new Date("2026-04-20T00:00:00Z"),
        isLockedAt: (input) => isPeriodLockedAt(projectState, input),
      },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].code).toBe("entry.locked_by_period");
  });

  it("final contractor projection matches the golden snapshot", () => {
    // Stable projection-equivalent shape the SQL `time.entry` table is
    // expected to produce after `rebuild_projections()`. Keep this in sync
    // with `apply_contractor_event` in supabase/time_migrations/*.sql.
    expect(projectionFromContractorState(contractorState))
      .toMatchInlineSnapshot(`
      [
        {
          "approvalState": "approved",
          "description": "morning focus",
          "entryId": "00000000-0000-4000-8000-000000000503",
          "interruptedEntryId": null,
          "isPlaceholder": false,
          "projectId": 7,
          "startedAt": "2026-04-19T08:00:00Z",
          "stoppedAt": "2026-04-19T09:45:00Z",
          "taskId": "00000000-0000-4000-8000-000000000101",
        },
        {
          "approvalState": "approved",
          "description": "afternoon wrap",
          "entryId": "00000000-0000-4000-8000-000000000504",
          "interruptedEntryId": null,
          "isPlaceholder": false,
          "projectId": 7,
          "startedAt": "2026-04-19T09:55:00.000Z",
          "stoppedAt": "2026-04-19T10:30:00Z",
          "taskId": "00000000-0000-4000-8000-000000000101",
        },
        {
          "approvalState": "approved",
          "description": null,
          "entryId": "00000000-0000-4000-8000-000000000502",
          "interruptedEntryId": "00000000-0000-4000-8000-000000000501",
          "isPlaceholder": false,
          "projectId": 7,
          "startedAt": "2026-04-19T10:30:00Z",
          "stoppedAt": "2026-04-19T11:00:00Z",
          "taskId": "00000000-0000-4000-8000-000000000102",
        },
      ]
    `);
  });
});

/**
 * Derive a projection-equivalent view of the contractor state — the rows you
 * would expect to see in SQL's `time.entry` after running
 * `rebuild_projections()`. Drops the soft-deleted source of the split and
 * sorts by `startedAt` for a stable diff.
 */
function projectionFromContractorState(state: ContractorStreamState) {
  return Object.values(state.entries)
    .filter((e) => e.deletedAt === null)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((e) => ({
      entryId: e.entryId,
      projectId: e.projectId,
      taskId: e.taskId,
      startedAt: e.startedAt,
      stoppedAt: e.stoppedAt,
      approvalState: e.approvalState,
      description: e.description,
      interruptedEntryId: e.interruptedEntryId,
      isPlaceholder: e.isPlaceholder,
    }));
}
