import { describe, expect, it } from "vitest";
import {
  applyContractorEvent,
  emptyContractorStreamState,
  replayContractorStream,
  validateContractorEvent,
} from "@/api/time-event/aggregates/contractor-stream.ts";
import type { ContractorEventPayload, RateSnapshot } from "@/api/time-event/time-event.api.ts";

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const t = (iso: string) => iso;

const RATE: RateSnapshot = {
  unit: "h",
  unitPrice: 100,
  currency: "PLN",
  billingUnitPrice: 30,
  billingCurrency: "EUR",
  exchangeRate: 4.3,
};

const ctx = {
  actorUserId: uuid(900),
  now: new Date("2026-04-19T12:00:00Z"),
};

const startedPayload = (
  overrides: Partial<Extract<ContractorEventPayload, { type: "EntryStarted" }>> = {},
): ContractorEventPayload => ({
  type: "EntryStarted",
  entryId: uuid(1),
  clientId: 1,
  workspaceId: 2,
  projectId: 3,
  task: { taskId: uuid(10), taskVersion: 0 },
  activity: { activityId: uuid(11), activityVersion: 0 },
  startedAt: t("2026-04-19T08:00:00Z"),
  rate: RATE,
  isPlaceholder: false,
  ...overrides,
});

describe("applyContractorEvent — happy path", () => {
  it("creates an entry on EntryStarted", () => {
    const s1 = applyContractorEvent(
      emptyContractorStreamState,
      startedPayload(),
      { contractorId: 42, occurredAt: t("2026-04-19T08:00:00Z") },
    );
    expect(s1.contractorId).toBe(42);
    expect(s1.entries[uuid(1)].startedAt).toBe("2026-04-19T08:00:00Z");
    expect(s1.entries[uuid(1)].stoppedAt).toBeNull();
    expect(s1.entries[uuid(1)].approvalState).toBe("draft");
  });

  it("stops a running entry", () => {
    const s = replayContractorStream(42, [
      { payload: startedPayload(), occurredAt: t("2026-04-19T08:00:00Z") },
      {
        payload: { type: "EntryStopped", entryId: uuid(1), stoppedAt: t("2026-04-19T09:00:00Z") },
        occurredAt: t("2026-04-19T09:00:00Z"),
      },
    ]);
    expect(s.entries[uuid(1)].stoppedAt).toBe("2026-04-19T09:00:00Z");
  });

  it("transitions approval states draft -> submitted -> approved", () => {
    const s = replayContractorStream(42, [
      { payload: startedPayload(), occurredAt: t("2026-04-19T08:00:00Z") },
      {
        payload: { type: "EntryStopped", entryId: uuid(1), stoppedAt: t("2026-04-19T09:00:00Z") },
        occurredAt: t("2026-04-19T09:00:00Z"),
      },
      {
        payload: {
          type: "TimeSubmittedForApproval",
          entryIds: [uuid(1)],
          submittedAt: t("2026-04-19T09:01:00Z"),
        },
        occurredAt: t("2026-04-19T09:01:00Z"),
      },
      {
        payload: {
          type: "TimeApproved",
          entryIds: [uuid(1)],
          approvedAt: t("2026-04-19T09:02:00Z"),
          approverUserId: uuid(900),
        },
        occurredAt: t("2026-04-19T09:02:00Z"),
      },
    ]);
    expect(s.entries[uuid(1)].approvalState).toBe("approved");
  });
});

describe("applyContractorEvent — split / merge / import", () => {
  it("splits a stopped entry into two with a gap", () => {
    const s = replayContractorStream(42, [
      { payload: startedPayload(), occurredAt: t("2026-04-19T08:00:00Z") },
      {
        payload: { type: "EntryStopped", entryId: uuid(1), stoppedAt: t("2026-04-19T10:00:00Z") },
        occurredAt: t("2026-04-19T10:00:00Z"),
      },
      {
        payload: {
          type: "EntrySplit",
          sourceEntryId: uuid(1),
          splitAt: t("2026-04-19T09:00:00Z"),
          gapSeconds: 600,
          leftEntryId: uuid(20),
          rightEntryId: uuid(21),
        },
        occurredAt: t("2026-04-19T10:01:00Z"),
      },
    ]);
    expect(s.entries[uuid(1)].deletedAt).not.toBeNull();
    expect(s.entries[uuid(20)].startedAt).toBe("2026-04-19T08:00:00Z");
    expect(s.entries[uuid(20)].stoppedAt).toBe("2026-04-19T09:00:00Z");
    expect(s.entries[uuid(21)].startedAt).toBe("2026-04-19T09:10:00.000Z");
    expect(s.entries[uuid(21)].stoppedAt).toBe("2026-04-19T10:00:00Z");
  });

  it("imports a tmetric entry and remembers the id for dedup", () => {
    const s = applyContractorEvent(emptyContractorStreamState, {
      type: "EntryImportedFromTmetric",
      entryId: uuid(50),
      tmetricEntryId: "tm-12345",
      clientId: 1,
      workspaceId: 2,
      projectId: 3,
      task: { taskId: uuid(10), taskVersion: 0 },
      activity: { activityId: uuid(11), activityVersion: 0 },
      startedAt: t("2026-04-18T08:00:00Z"),
      stoppedAt: t("2026-04-18T09:30:00Z"),
      rate: RATE,
      isPlaceholder: false,
    }, { contractorId: 42, occurredAt: t("2026-04-19T08:00:00Z") });
    expect(s.importedTmetricIds["tm-12345"]).toBe(true);
    expect(s.entries[uuid(50)].lineage[0].kind).toBe("tmetric_import");
  });
});

describe("validateContractorEvent — single-running-entry policy", () => {
  it("rejects a 2nd EntryStarted while one is running", () => {
    const s = applyContractorEvent(
      emptyContractorStreamState,
      startedPayload(),
      { contractorId: 42, occurredAt: t("2026-04-19T08:00:00Z") },
    );
    const r = validateContractorEvent(
      s,
      startedPayload({ entryId: uuid(2), startedAt: t("2026-04-19T08:30:00Z") }),
      ctx,
    );
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors[0].code).toBe("entry.concurrent_timer");
  });

  it("rejects a jump-on EntryStarted while another entry is still running (must stop first)", () => {
    const s = applyContractorEvent(
      emptyContractorStreamState,
      startedPayload(),
      { contractorId: 42, occurredAt: t("2026-04-19T08:00:00Z") },
    );
    const r = validateContractorEvent(
      s,
      startedPayload({
        entryId: uuid(2),
        startedAt: t("2026-04-19T08:30:00Z"),
        interruptedEntryId: uuid(1),
      }),
      ctx,
    );
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors[0].code).toBe("entry.concurrent_timer");
  });

  it("accepts a jump-on EntryStarted once the interrupted entry has been stopped (stop-then-start pivot)", () => {
    let s = applyContractorEvent(
      emptyContractorStreamState,
      startedPayload(),
      { contractorId: 42, occurredAt: t("2026-04-19T08:00:00Z") },
    );
    s = applyContractorEvent(
      s,
      { type: "EntryStopped", entryId: uuid(1), stoppedAt: t("2026-04-19T08:30:00Z") },
      { contractorId: 42, occurredAt: t("2026-04-19T08:30:00Z") },
    );
    const r = validateContractorEvent(
      s,
      startedPayload({
        entryId: uuid(2),
        startedAt: t("2026-04-19T08:30:00Z"),
        interruptedEntryId: uuid(1),
      }),
      ctx,
    );
    expect(r.ok).toBe(true);
  });

  it("rejects a jump-on whose interruptedEntryId points at a missing entry", () => {
    const r = validateContractorEvent(
      { ...emptyContractorStreamState, contractorId: 42 },
      startedPayload({
        entryId: uuid(2),
        startedAt: t("2026-04-19T08:30:00Z"),
        interruptedEntryId: uuid(999),
      }),
      ctx,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].code).toBe("entry.not_found");
  });
});

describe("validateContractorEvent — approval & locks", () => {
  it("blocks edits while the entry is approved", () => {
    const s = replayContractorStream(42, [
      { payload: startedPayload(), occurredAt: t("2026-04-19T08:00:00Z") },
      {
        payload: { type: "EntryStopped", entryId: uuid(1), stoppedAt: t("2026-04-19T09:00:00Z") },
        occurredAt: t("2026-04-19T09:00:00Z"),
      },
      {
        payload: {
          type: "TimeSubmittedForApproval",
          entryIds: [uuid(1)],
          submittedAt: t("2026-04-19T09:01:00Z"),
        },
        occurredAt: t("2026-04-19T09:01:00Z"),
      },
      {
        payload: {
          type: "TimeApproved",
          entryIds: [uuid(1)],
          approvedAt: t("2026-04-19T09:02:00Z"),
          approverUserId: uuid(900),
        },
        occurredAt: t("2026-04-19T09:02:00Z"),
      },
    ]);
    const r = validateContractorEvent(
      s,
      {
        type: "EntryDescriptionChanged",
        entryId: uuid(1),
        description: "wat",
      },
      ctx,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].code).toBe("entry.locked_by_approval_state");
  });

  it("refuses to submit placeholder entries for approval", () => {
    const s = replayContractorStream(42, [
      {
        payload: startedPayload({ isPlaceholder: true, task: undefined, activity: undefined }),
        occurredAt: t("2026-04-19T08:00:00Z"),
      },
      {
        payload: {
          type: "EntryStopped",
          entryId: uuid(1),
          stoppedAt: t("2026-04-19T09:00:00Z"),
        },
        occurredAt: t("2026-04-19T09:00:00Z"),
      },
    ]);
    const r = validateContractorEvent(
      s,
      {
        type: "TimeSubmittedForApproval",
        entryIds: [uuid(1)],
        submittedAt: t("2026-04-19T09:05:00Z"),
      },
      ctx,
    );
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors.map((e) => e.code)).toContain(
        "approval.entry_is_placeholder",
      );
  });

  it("rejects start inside a locked period", () => {
    const r = validateContractorEvent(
      emptyContractorStreamState,
      startedPayload(),
      {
        ...ctx,
        isLockedAt: () => true,
      },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].code).toBe("entry.locked_by_period");
  });
});

describe("validateContractorEvent — split rules", () => {
  it("rejects splitAt outside (start, stop)", () => {
    const s = replayContractorStream(42, [
      { payload: startedPayload(), occurredAt: t("2026-04-19T08:00:00Z") },
      {
        payload: { type: "EntryStopped", entryId: uuid(1), stoppedAt: t("2026-04-19T10:00:00Z") },
        occurredAt: t("2026-04-19T10:00:00Z"),
      },
    ]);
    const r = validateContractorEvent(
      s,
      {
        type: "EntrySplit",
        sourceEntryId: uuid(1),
        splitAt: t("2026-04-19T11:00:00Z"),
        gapSeconds: 0,
        leftEntryId: uuid(20),
        rightEntryId: uuid(21),
      },
      ctx,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.map((e) => e.code)).toContain("entry.split_out_of_range");
  });

  it("rejects gap that would push the right side past stoppedAt", () => {
    const s = replayContractorStream(42, [
      { payload: startedPayload(), occurredAt: t("2026-04-19T08:00:00Z") },
      {
        payload: { type: "EntryStopped", entryId: uuid(1), stoppedAt: t("2026-04-19T10:00:00Z") },
        occurredAt: t("2026-04-19T10:00:00Z"),
      },
    ]);
    const r = validateContractorEvent(
      s,
      {
        type: "EntrySplit",
        sourceEntryId: uuid(1),
        splitAt: t("2026-04-19T09:50:00Z"),
        gapSeconds: 60 * 60, // 1h gap, but only 10min remain
        leftEntryId: uuid(20),
        rightEntryId: uuid(21),
      },
      ctx,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.map((e) => e.code)).toContain("entry.split_gap_too_large");
  });
});

describe("validateContractorEvent — merge rules", () => {
  it("requires shared attributes", () => {
    let s = replayContractorStream(42, [
      { payload: startedPayload({ entryId: uuid(1), projectId: 3 }), occurredAt: t("2026-04-19T08:00:00Z") },
      {
        payload: { type: "EntryStopped", entryId: uuid(1), stoppedAt: t("2026-04-19T09:00:00Z") },
        occurredAt: t("2026-04-19T09:00:00Z"),
      },
    ]);
    s = applyContractorEvent(s, startedPayload({ entryId: uuid(2), projectId: 999, startedAt: t("2026-04-19T09:00:00Z") }),
      { contractorId: 42, occurredAt: t("2026-04-19T09:00:00Z") });
    s = applyContractorEvent(s, { type: "EntryStopped", entryId: uuid(2), stoppedAt: t("2026-04-19T10:00:00Z") },
      { contractorId: 42, occurredAt: t("2026-04-19T10:00:00Z") });

    const r = validateContractorEvent(
      s,
      {
        type: "EntryMerged",
        leftEntryId: uuid(1),
        rightEntryId: uuid(2),
        mergedEntryId: uuid(3),
      },
      ctx,
    );
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors.map((e) => e.code)).toContain("entry.merge_mismatched_attributes");
  });
});

describe("validateContractorEvent — TmetricImport dedup", () => {
  it("rejects a 2nd import of the same tmetric id", () => {
    const s = applyContractorEvent(emptyContractorStreamState, {
      type: "EntryImportedFromTmetric",
      entryId: uuid(50),
      tmetricEntryId: "tm-12345",
      clientId: 1,
      workspaceId: 2,
      projectId: 3,
      task: { taskId: uuid(10), taskVersion: 0 },
      activity: { activityId: uuid(11), activityVersion: 0 },
      startedAt: t("2026-04-18T08:00:00Z"),
      stoppedAt: t("2026-04-18T09:30:00Z"),
      rate: RATE,
      isPlaceholder: false,
    }, { contractorId: 42, occurredAt: t("2026-04-19T08:00:00Z") });

    const r = validateContractorEvent(
      s,
      {
        type: "EntryImportedFromTmetric",
        entryId: uuid(51),
        tmetricEntryId: "tm-12345",
        clientId: 1,
        workspaceId: 2,
        projectId: 3,
        task: { taskId: uuid(10), taskVersion: 0 },
        activity: { activityId: uuid(11), activityVersion: 0 },
        startedAt: t("2026-04-18T08:00:00Z"),
        stoppedAt: t("2026-04-18T09:30:00Z"),
        rate: RATE,
        isPlaceholder: false,
      },
      ctx,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].code).toBe("entry.tmetric_id_already_imported");
  });
});
