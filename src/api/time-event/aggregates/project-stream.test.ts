import { describe, expect, it } from "vitest";
import {
  applyProjectEvent,
  emptyProjectStreamState,
  isPeriodLockedAt,
  replayProjectStream,
  validateProjectEvent,
} from "@/api/time-event/aggregates/project-stream.ts";
import type {
  ProjectAggregateKind,
  ProjectEventPayload,
  RateDefinition,
} from "@/api/time-event/time-event.api.ts";

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const t = (iso: string) => iso;

const ctx = {
  actorUserId: uuid(900),
  now: new Date("2026-04-19T12:00:00Z"),
};

const RATE: RateDefinition = {
  unit: "h",
  unitPrice: 100,
  currency: "PLN",
  billingUnitPrice: 30,
  billingCurrency: "EUR",
  exchangeRate: 4.3,
};

const meta = (
  kind: ProjectAggregateKind,
  aggregateId: string,
  occurredAt = "2026-04-19T08:00:00Z",
  projectId = 9,
) => ({
  projectId,
  aggregateKind: kind,
  aggregateId,
  occurredAt,
});

const taskCreated = (overrides: Partial<Extract<ProjectEventPayload, { type: "TaskCreated" }>> = {}): ProjectEventPayload => ({
  type: "TaskCreated",
  taskId: uuid(1),
  clientId: 5,
  name: "ENG-1",
  externalLinks: [],
  assignees: [],
  ...overrides,
});

describe("applyProjectEvent — task lifecycle", () => {
  it("creates, renames, and bumps version", () => {
    let s = applyProjectEvent(emptyProjectStreamState, taskCreated(), meta("task", uuid(1)));
    expect(s.tasks[uuid(1)].name).toBe("ENG-1");
    expect(s.tasks[uuid(1)].version).toBe(1);

    s = applyProjectEvent(s, { type: "TaskRenamed", taskId: uuid(1), name: "ENG-1 fix login" }, meta("task", uuid(1)));
    expect(s.tasks[uuid(1)].name).toBe("ENG-1 fix login");
    expect(s.tasks[uuid(1)].version).toBe(2);
  });

  it("assigns and unassigns idempotently", () => {
    let s = applyProjectEvent(emptyProjectStreamState, taskCreated(), meta("task", uuid(1)));
    s = applyProjectEvent(s, { type: "TaskAssigned", taskId: uuid(1), userId: uuid(50) }, meta("task", uuid(1)));
    s = applyProjectEvent(s, { type: "TaskAssigned", taskId: uuid(1), userId: uuid(50) }, meta("task", uuid(1)));
    expect(s.tasks[uuid(1)].assignees).toEqual([uuid(50)]);
    s = applyProjectEvent(s, { type: "TaskUnassigned", taskId: uuid(1), userId: uuid(50) }, meta("task", uuid(1)));
    expect(s.tasks[uuid(1)].assignees).toEqual([]);
  });

  it("completes then reopens", () => {
    let s = applyProjectEvent(emptyProjectStreamState, taskCreated(), meta("task", uuid(1)));
    s = applyProjectEvent(s, {
      type: "TaskCompleted",
      taskId: uuid(1),
      completedAt: t("2026-04-19T10:00:00Z"),
      completedByUserId: uuid(900),
    }, meta("task", uuid(1)));
    expect(s.tasks[uuid(1)].completedAt).toBe("2026-04-19T10:00:00Z");
    s = applyProjectEvent(s, {
      type: "TaskReopened",
      taskId: uuid(1),
      reopenedAt: t("2026-04-19T11:00:00Z"),
      reopenedByUserId: uuid(900),
    }, meta("task", uuid(1)));
    expect(s.tasks[uuid(1)].completedAt).toBeNull();
  });
});

describe("validateProjectEvent — task rules", () => {
  it("rejects 2nd TaskCreated with the same id", () => {
    const s = applyProjectEvent(emptyProjectStreamState, taskCreated(), meta("task", uuid(1)));
    const r = validateProjectEvent(s, taskCreated(), ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].code).toBe("task.already_exists");
  });

  it("rejects TaskCompleted on already-completed task", () => {
    let s = applyProjectEvent(emptyProjectStreamState, taskCreated(), meta("task", uuid(1)));
    s = applyProjectEvent(s, {
      type: "TaskCompleted",
      taskId: uuid(1),
      completedAt: t("2026-04-19T10:00:00Z"),
      completedByUserId: uuid(900),
    }, meta("task", uuid(1)));
    const r = validateProjectEvent(s, {
      type: "TaskCompleted",
      taskId: uuid(1),
      completedAt: t("2026-04-19T11:00:00Z"),
      completedByUserId: uuid(900),
    }, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].code).toBe("task.already_completed");
  });

  it("rejects double-assign", () => {
    let s = applyProjectEvent(emptyProjectStreamState, taskCreated(), meta("task", uuid(1)));
    s = applyProjectEvent(s, { type: "TaskAssigned", taskId: uuid(1), userId: uuid(50) }, meta("task", uuid(1)));
    const r = validateProjectEvent(s, { type: "TaskAssigned", taskId: uuid(1), userId: uuid(50) }, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].code).toBe("task.assignee_already_present");
  });

  it("rejects external-link removal when not present", () => {
    const s = applyProjectEvent(emptyProjectStreamState, taskCreated(), meta("task", uuid(1)));
    const r = validateProjectEvent(s, {
      type: "TaskExternalLinkRemoved",
      taskId: uuid(1),
      provider: "linear",
      externalId: "ENG-XYZ",
    }, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].code).toBe("task.external_link_not_present");
  });
});

describe("validateProjectEvent — rate rules", () => {
  it("requires a strictly later effectiveFrom on RateSet over an existing aggregate", () => {
    let s = applyProjectEvent(emptyProjectStreamState, {
      type: "RateSet",
      rateAggregateId: uuid(2),
      contractorId: 7,
      effectiveFrom: "2026-04-01",
      rate: RATE,
    }, meta("rate", uuid(2)));
    const r = validateProjectEvent(s, {
      type: "RateSet",
      rateAggregateId: uuid(2),
      contractorId: 7,
      effectiveFrom: "2026-04-01",
      rate: { ...RATE, unitPrice: 200 },
    }, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].code).toBe("rate.effective_from_not_after_current");

    // strictly later passes
    s = applyProjectEvent(s, {
      type: "RateSet",
      rateAggregateId: uuid(2),
      contractorId: 7,
      effectiveFrom: "2026-05-01",
      rate: { ...RATE, unitPrice: 200 },
    }, meta("rate", uuid(2)));
    expect(s.rates[uuid(2)].current.unitPrice).toBe(200);
  });

  it("rejects two active rate aggregates for the same contractor", () => {
    const s = applyProjectEvent(emptyProjectStreamState, {
      type: "RateSet",
      rateAggregateId: uuid(2),
      contractorId: 7,
      effectiveFrom: "2026-04-01",
      rate: RATE,
    }, meta("rate", uuid(2)));
    const r = validateProjectEvent(s, {
      type: "RateSet",
      rateAggregateId: uuid(3),
      contractorId: 7,
      effectiveFrom: "2026-04-01",
      rate: RATE,
    }, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].code).toBe("rate.already_exists");
  });

  it("rejects RateSet with a different contractor on the same aggregate", () => {
    const s = applyProjectEvent(emptyProjectStreamState, {
      type: "RateSet",
      rateAggregateId: uuid(2),
      contractorId: 7,
      effectiveFrom: "2026-04-01",
      rate: RATE,
    }, meta("rate", uuid(2)));
    const r = validateProjectEvent(s, {
      type: "RateSet",
      rateAggregateId: uuid(2),
      contractorId: 8,
      effectiveFrom: "2026-05-01",
      rate: RATE,
    }, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].code).toBe("rate.contractor_mismatch");
  });
});

describe("validateProjectEvent — period locks", () => {
  it("rejects unlock on missing lock", () => {
    const r = validateProjectEvent(emptyProjectStreamState, {
      type: "PeriodUnlocked",
      lockId: uuid(40),
      unlockedAt: t("2026-04-19T12:00:00Z"),
      unlockedByUserId: uuid(900),
    }, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].code).toBe("lock.not_found");
  });

  it("isPeriodLockedAt returns true inside the window for matching contractor", () => {
    const s = applyProjectEvent(emptyProjectStreamState, {
      type: "PeriodLocked",
      lockId: uuid(40),
      contractorId: null,
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      lockedAt: t("2026-04-01T08:00:00Z"),
      lockedByUserId: uuid(900),
    }, meta("period_lock", uuid(40)));
    expect(
      isPeriodLockedAt(s, {
        projectId: 9,
        contractorId: 7,
        occurredAt: t("2026-03-15T12:00:00Z"),
      }),
    ).toBe(true);
    expect(
      isPeriodLockedAt(s, {
        projectId: 9,
        contractorId: 7,
        occurredAt: t("2026-04-01T00:00:00Z"),
      }),
    ).toBe(false);
  });

  it("isPeriodLockedAt skips unlocked entries and other-project locks", () => {
    let s = applyProjectEvent(emptyProjectStreamState, {
      type: "PeriodLocked",
      lockId: uuid(40),
      contractorId: 7,
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      lockedAt: t("2026-04-01T08:00:00Z"),
      lockedByUserId: uuid(900),
    }, meta("period_lock", uuid(40)));
    s = applyProjectEvent(s, {
      type: "PeriodUnlocked",
      lockId: uuid(40),
      unlockedAt: t("2026-04-02T08:00:00Z"),
      unlockedByUserId: uuid(900),
    }, meta("period_lock", uuid(40)));
    expect(
      isPeriodLockedAt(s, {
        projectId: 9,
        contractorId: 7,
        occurredAt: t("2026-03-15T12:00:00Z"),
      }),
    ).toBe(false);
  });

  it("skips lock targeted at a different contractor", () => {
    const s = applyProjectEvent(emptyProjectStreamState, {
      type: "PeriodLocked",
      lockId: uuid(40),
      contractorId: 7,
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      lockedAt: t("2026-04-01T08:00:00Z"),
      lockedByUserId: uuid(900),
    }, meta("period_lock", uuid(40)));
    expect(
      isPeriodLockedAt(s, {
        projectId: 9,
        contractorId: 999,
        occurredAt: t("2026-03-15T12:00:00Z"),
      }),
    ).toBe(false);
  });
});

describe("replayProjectStream", () => {
  it("folds a heterogeneous event log", () => {
    const s = replayProjectStream(9, [
      { payload: taskCreated(), aggregateKind: "task", aggregateId: uuid(1), occurredAt: t("2026-04-19T08:00:00Z") },
      {
        payload: { type: "ActivityCreated", activityId: uuid(80), name: "development", kinds: ["development"] },
        aggregateKind: "activity",
        aggregateId: uuid(80),
        occurredAt: t("2026-04-19T08:01:00Z"),
      },
      {
        payload: { type: "RateSet", rateAggregateId: uuid(70), contractorId: 7, effectiveFrom: "2026-04-01", rate: RATE },
        aggregateKind: "rate",
        aggregateId: uuid(70),
        occurredAt: t("2026-04-19T08:02:00Z"),
      },
    ]);
    expect(Object.keys(s.tasks)).toHaveLength(1);
    expect(Object.keys(s.activities)).toHaveLength(1);
    expect(Object.keys(s.rates)).toHaveLength(1);
  });
});
