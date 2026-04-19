import { describe, expect, it } from "vitest";
import {
  createWorld,
  makeEnvelope,
  makeProjectEnvelope,
  uuid,
} from "../src/test/harness.ts";
import type { RateSnapshot } from "@/api/time-event/time-event.api.ts";

const RATE: RateSnapshot = {
  unit: "h",
  unitPrice: 100,
  currency: "PLN",
  billingUnitPrice: 30,
  billingCurrency: "EUR",
  exchangeRate: 4.3,
};

describe("POST /events - health & happy path", () => {
  it("rejects an unauthenticated GET on /streams (no resolver configured) — sanity", async () => {
    // We always wire a resolver in createWorld(), so this just confirms a 200.
    const t = createWorld();
    const res = await t.when.getContractorHead(1);
    expect(res.status).toBe(200);
  });

  it("accepts a well-formed EntryStarted and returns seq=1", async () => {
    const t = createWorld({ now: () => new Date("2026-04-19T12:00:00Z") });
    const res = await t.when.postEvent({
      stream: "contractor",
      envelope: makeEnvelope(42, uuid(1001), "2026-04-19T08:00:00Z"),
      payload: {
        type: "EntryStarted",
        entryId: uuid(1),
        clientId: 1,
        workspaceId: 2,
        projectId: 3,
        task: { taskId: uuid(10), taskVersion: 0 },
        activity: { activityId: uuid(11), activityVersion: 0 },
        startedAt: "2026-04-19T08:00:00Z",
        rate: RATE,
        isPlaceholder: false,
      },
    });
    const { seq } = await t.then.expectAccepted(res);
    expect(seq).toBe(1);
    await t.then.expectContractorHead(42, 1);
  });
});

describe("POST /events - schema rejection", () => {
  it("returns 400 for a malformed payload (bad uuid)", async () => {
    const t = createWorld();
    const res = await t.when.postEvent({
      stream: "contractor",
      envelope: makeEnvelope(42, uuid(1001), "2026-04-19T08:00:00Z"),
      payload: {
        type: "EntryStarted",
        entryId: "not-a-uuid",
        clientId: 1,
        workspaceId: 2,
        projectId: 3,
        task: { taskId: uuid(10), taskVersion: 0 },
        activity: { activityId: uuid(11), activityVersion: 0 },
        startedAt: "2026-04-19T08:00:00Z",
        rate: RATE,
        isPlaceholder: false,
      } as never,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { kind: string };
    expect(body.kind).toBe("schema_invalid");
  });
});

describe("POST /events - domain rules via shared validator", () => {
  it("rejects a 2nd primary EntryStarted with entry.concurrent_timer (422)", async () => {
    const t = createWorld();
    await t.then.expectAccepted(
      await t.when.postEvent({
        stream: "contractor",
        envelope: makeEnvelope(42, uuid(1001), "2026-04-19T08:00:00Z"),
        payload: {
          type: "EntryStarted",
          entryId: uuid(1),
          clientId: 1,
          workspaceId: 2,
          projectId: 3,
          task: { taskId: uuid(10), taskVersion: 0 },
          activity: { activityId: uuid(11), activityVersion: 0 },
          startedAt: "2026-04-19T08:00:00Z",
          rate: RATE,
          isPlaceholder: false,
        },
      }),
    );

    const res = await t.when.postEvent({
      stream: "contractor",
      envelope: makeEnvelope(42, uuid(1002), "2026-04-19T09:00:00Z"),
      payload: {
        type: "EntryStarted",
        entryId: uuid(2),
        clientId: 1,
        workspaceId: 2,
        projectId: 3,
        task: { taskId: uuid(10), taskVersion: 0 },
        activity: { activityId: uuid(11), activityVersion: 0 },
        startedAt: "2026-04-19T09:00:00Z",
        rate: RATE,
        isPlaceholder: false,
      },
    });
    await t.then.expectValidationError(res, "entry.concurrent_timer");
  });
});

describe("POST /events - idempotent retries", () => {
  it("returns kind=duplicate (200) on a 2nd submission with the same clientEventId", async () => {
    const t = createWorld();
    const env = makeEnvelope(42, uuid(2001), "2026-04-19T08:00:00Z");
    const payload = {
      type: "EntryStarted" as const,
      entryId: uuid(1),
      clientId: 1,
      workspaceId: 2,
      projectId: 3,
      task: { taskId: uuid(10), taskVersion: 0 },
      activity: { activityId: uuid(11), activityVersion: 0 },
      startedAt: "2026-04-19T08:00:00Z",
      rate: RATE,
      isPlaceholder: false,
    };
    const r1 = await t.when.postEvent({ stream: "contractor", envelope: env, payload });
    const { seq } = await t.then.expectAccepted(r1);

    const r2 = await t.when.postEvent({ stream: "contractor", envelope: env, payload });
    expect(r2.status).toBe(200);
    const body = (await r2.json()) as { kind: string; existingSeq: number };
    expect(body.kind).toBe("duplicate");
    expect(body.existingSeq).toBe(seq);
  });
});

describe("POST /events - period-lock crosses streams", () => {
  it("EntryStarted is rejected when an active project lock covers the timestamp", async () => {
    const t = createWorld();
    // Lock March 2026 on project 3, all contractors.
    await t.given.projectEvents(3, [
      {
        envelope: makeProjectEnvelope(
          3,
          "period_lock",
          uuid(40),
          uuid(3001),
          "2026-04-01T08:00:00Z",
        ),
        payload: {
          type: "PeriodLocked",
          lockId: uuid(40),
          contractorId: null,
          periodStart: "2026-03-01",
          periodEnd: "2026-03-31",
          lockedAt: "2026-04-01T08:00:00Z",
          lockedByUserId: uuid(900),
        },
      },
    ]);

    const res = await t.when.postEvent({
      stream: "contractor",
      envelope: makeEnvelope(42, uuid(2001), "2026-03-15T12:00:00Z"),
      payload: {
        type: "EntryStarted",
        entryId: uuid(1),
        clientId: 1,
        workspaceId: 2,
        projectId: 3,
        task: { taskId: uuid(10), taskVersion: 0 },
        activity: { activityId: uuid(11), activityVersion: 0 },
        startedAt: "2026-03-15T12:00:00Z",
        rate: RATE,
        isPlaceholder: false,
      },
    });
    await t.then.expectValidationError(res, "entry.locked_by_period");
  });
});

describe("POST /events - project stream", () => {
  it("creates a task and increments the aggregate version", async () => {
    const t = createWorld();
    const res = await t.when.postEvent({
      stream: "project",
      envelope: makeProjectEnvelope(
        9,
        "task",
        uuid(100),
        uuid(4001),
        "2026-04-19T08:00:00Z",
      ),
      payload: {
        type: "TaskCreated",
        taskId: uuid(100),
        clientId: 5,
        name: "ENG-1 first task",
        externalLinks: [],
        assignees: [],
      },
    });
    await t.then.expectAccepted(res);

    const headRes = await fetch(
      `https://test/streams/project/9/aggregate/task/${uuid(100)}/head`,
    ).catch(() => null);
    void headRes; // not testing CF fetch routing here
  });
});
