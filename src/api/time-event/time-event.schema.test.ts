import { describe, expect, it } from "vitest";
import {
  contractorEventSchema,
  projectEventSchema,
  rateSnapshotSchema,
  computeNetValue,
  quantityFromDuration,
  EVENT_VERSION_V1,
} from "@/api/time-event/time-event.api.ts";

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ts = "2026-04-19T12:00:00.000Z";

const baseEnvelope = {
  clientEventId: uuid(1),
  correlationId: uuid(2),
  eventVersion: EVENT_VERSION_V1,
  occurredAt: ts,
};

const sampleRate = {
  unit: "h",
  unitPrice: 100,
  currency: "PLN",
};

describe("rate snapshot schema", () => {
  it("accepts a well-formed rate snapshot with optional quantity/netValue", () => {
    const parsed = rateSnapshotSchema.parse({
      ...sampleRate,
      quantity: 1.5,
      netValue: 150,
    });
    expect(parsed.quantity).toBe(1.5);
  });

  it("rejects a non-3-letter currency code", () => {
    const r = rateSnapshotSchema.safeParse({ ...sampleRate, currency: "PL" });
    expect(r.success).toBe(false);
  });

  it("rejects a negative unit price", () => {
    const r = rateSnapshotSchema.safeParse({ ...sampleRate, unitPrice: -1 });
    expect(r.success).toBe(false);
  });

  it("computes net value with 2-decimal rounding", () => {
    expect(computeNetValue(1.333, 100)).toBe(133.3);
    expect(computeNetValue(1.337, 100)).toBe(133.7);
  });

  it("derives quantity from duration for hour/day units", () => {
    expect(quantityFromDuration("h", 3600)).toBe(1);
    expect(quantityFromDuration("d", 86400)).toBe(1);
    expect(quantityFromDuration("pc", 3600)).toBeUndefined();
  });
});

describe("contractor event — EntryStarted", () => {
  it("accepts a non-placeholder entry that carries task + activity", () => {
    const r = contractorEventSchema.safeParse({
      envelope: { ...baseEnvelope, contractorId: 42 },
      payload: {
        type: "EntryStarted",
        entryId: uuid(10),
        clientId: 1,
        workspaceId: 2,
        projectId: 3,
        task: { taskId: uuid(11), taskVersion: 0 },
        activity: { activityId: uuid(12), activityVersion: 0 },
        startedAt: ts,
        rate: sampleRate,
        isPlaceholder: false,
      },
    });
    expect(r.success).toBe(true);
  });

  it("rejects a non-placeholder entry missing task", () => {
    const r = contractorEventSchema.safeParse({
      envelope: { ...baseEnvelope, contractorId: 42 },
      payload: {
        type: "EntryStarted",
        entryId: uuid(10),
        clientId: 1,
        workspaceId: 2,
        projectId: 3,
        startedAt: ts,
        rate: sampleRate,
        isPlaceholder: false,
      },
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("task"))).toBe(true);
    }
  });

  it("accepts a placeholder entry without task / activity", () => {
    const r = contractorEventSchema.safeParse({
      envelope: { ...baseEnvelope, contractorId: 42 },
      payload: {
        type: "EntryStarted",
        entryId: uuid(10),
        clientId: 1,
        workspaceId: 2,
        projectId: 3,
        startedAt: ts,
        rate: sampleRate,
        isPlaceholder: true,
      },
    });
    expect(r.success).toBe(true);
  });

  it("dedupes and lower-cases tags", () => {
    const r = contractorEventSchema.parse({
      envelope: { ...baseEnvelope, contractorId: 42 },
      payload: {
        type: "EntryStarted",
        entryId: uuid(10),
        clientId: 1,
        workspaceId: 2,
        projectId: 3,
        task: { taskId: uuid(11), taskVersion: 0 },
        activity: { activityId: uuid(12), activityVersion: 0 },
        startedAt: ts,
        rate: sampleRate,
        tags: ["Refactor", "refactor", "BUG"],
      },
    });
    if (r.payload.type !== "EntryStarted") throw new Error("unreachable");
    expect(r.payload.tags).toEqual(["refactor", "bug"]);
  });
});

describe("contractor event — split / merge id rules", () => {
  it("rejects EntrySplit with identical left/right ids", () => {
    const r = contractorEventSchema.safeParse({
      envelope: { ...baseEnvelope, contractorId: 1 },
      payload: {
        type: "EntrySplit",
        sourceEntryId: uuid(20),
        splitAt: ts,
        gapSeconds: 60,
        leftEntryId: uuid(21),
        rightEntryId: uuid(21),
      },
    });
    expect(r.success).toBe(false);
  });

  it("rejects EntryMerged with overlapping ids", () => {
    const r = contractorEventSchema.safeParse({
      envelope: { ...baseEnvelope, contractorId: 1 },
      payload: {
        type: "EntryMerged",
        leftEntryId: uuid(30),
        rightEntryId: uuid(31),
        mergedEntryId: uuid(30),
      },
    });
    expect(r.success).toBe(false);
  });
});

describe("project event — PeriodLocked", () => {
  it("accepts a valid lock window", () => {
    const r = projectEventSchema.safeParse({
      envelope: {
        ...baseEnvelope,
        projectId: 9,
        aggregateKind: "period_lock",
        aggregateId: uuid(40),
      },
      payload: {
        type: "PeriodLocked",
        lockId: uuid(40),
        contractorId: null,
        periodStart: "2026-03-01",
        periodEnd: "2026-03-31",
        lockedAt: ts,
        lockedByUserId: uuid(41),
      },
    });
    expect(r.success).toBe(true);
  });

  it("rejects start > end", () => {
    const r = projectEventSchema.safeParse({
      envelope: {
        ...baseEnvelope,
        projectId: 9,
        aggregateKind: "period_lock",
        aggregateId: uuid(40),
      },
      payload: {
        type: "PeriodLocked",
        lockId: uuid(40),
        contractorId: null,
        periodStart: "2026-04-01",
        periodEnd: "2026-03-31",
        lockedAt: ts,
        lockedByUserId: uuid(41),
      },
    });
    expect(r.success).toBe(false);
  });
});

describe("project event — TaskCreated", () => {
  it("accepts a minimal task", () => {
    const r = projectEventSchema.safeParse({
      envelope: {
        ...baseEnvelope,
        projectId: 9,
        aggregateKind: "task",
        aggregateId: uuid(50),
      },
      payload: {
        type: "TaskCreated",
        taskId: uuid(50),
        clientId: 1,
        name: "ENG-123 fix login redirect",
      },
    });
    expect(r.success).toBe(true);
  });

  it("accepts external links + assignees + estimate", () => {
    const r = projectEventSchema.parse({
      envelope: {
        ...baseEnvelope,
        projectId: 9,
        aggregateKind: "task",
        aggregateId: uuid(50),
      },
      payload: {
        type: "TaskCreated",
        taskId: uuid(50),
        clientId: 1,
        name: "ENG-123",
        externalLinks: [
          {
            provider: "linear",
            externalId: "ENG-123",
            url: "https://linear.app/x/issue/ENG-123",
          },
        ],
        assignees: [51],
        estimate: { quantity: 8, unit: "h" },
      },
    });
    if (r.payload.type !== "TaskCreated") throw new Error("unreachable");
    expect(r.payload.externalLinks).toHaveLength(1);
    expect(r.payload.estimate?.quantity).toBe(8);
  });
});
