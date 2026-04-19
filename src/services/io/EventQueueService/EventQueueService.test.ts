import { describe, expect, it } from "vitest";
import {
  applyPendingContractorEvents,
  createEventQueueService,
} from "@/services/io/EventQueueService/EventQueueService.impl";
import { InMemoryEventQueueStorage } from "@/api/time-event-queue/event-queue-storage.in-memory";
import type {
  ContractorEventEnvelope,
  ContractorEventPayload,
  RateSnapshot,
} from "@/api/time-event/time-event.api";
import type {
  SubmitContractorEventInput,
  SubmitEventResult,
  SubmitProjectEventInput,
  TimeEventsWorkerClient,
} from "@/api/time-event-queue/time-events-worker-client";
import { createMessageService } from "@/services/internal/MessageService/MessageService.impl";

const RATE: RateSnapshot = {
  unit: "h",
  unitPrice: 100,
  currency: "PLN",
  billingUnitPrice: 30,
  billingCurrency: "EUR",
  exchangeRate: 4.3,
};

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function envelope(
  contractorId: number,
  clientEventId: string,
  occurredAt = "2026-04-19T08:00:00Z",
): ContractorEventEnvelope {
  return {
    clientEventId,
    correlationId: uuid(800),
    eventVersion: 1,
    occurredAt,
    contractorId,
  };
}

function startedPayload(
  entryId: string,
  startedAt = "2026-04-19T08:00:00Z",
  overrides: Partial<
    Extract<ContractorEventPayload, { type: "EntryStarted" }>
  > = {},
): ContractorEventPayload {
  return {
    type: "EntryStarted",
    entryId,
    clientId: 1,
    workspaceId: 2,
    projectId: 3,
    task: { taskId: uuid(10), taskVersion: 0 },
    activity: { activityId: uuid(11), activityVersion: 0 },
    startedAt,
    rate: RATE,
    isPlaceholder: false,
    ...overrides,
  };
}

function stoppedPayload(
  entryId: string,
  stoppedAt = "2026-04-19T09:00:00Z",
): ContractorEventPayload {
  return { type: "EntryStopped", entryId, stoppedAt };
}

class FakeWorkerClient implements TimeEventsWorkerClient {
  responses: Array<SubmitEventResult> = [];
  calls: Array<SubmitContractorEventInput | SubmitProjectEventInput> = [];

  async submitContractorEvent(
    input: SubmitContractorEventInput,
  ): Promise<SubmitEventResult> {
    this.calls.push(input);
    return this.nextResponse(input.envelope.clientEventId);
  }

  async submitProjectEvent(
    input: SubmitProjectEventInput,
  ): Promise<SubmitEventResult> {
    this.calls.push(input);
    return this.nextResponse(input.envelope.clientEventId);
  }

  private nextResponse(clientEventId: string): SubmitEventResult {
    const next = this.responses.shift();
    if (!next) {
      return {
        kind: "transient_failure",
        message: `no canned response for ${clientEventId}`,
      };
    }
    return next;
  }
}

function createService(
  workerClient: TimeEventsWorkerClient,
  opts: {
    actorUserId?: string;
    backoffBaseMs?: number;
    deliveredRetentionMs?: number;
  } = {},
) {
  const storage = new InMemoryEventQueueStorage();
  const messageService = createMessageService();
  const service = createEventQueueService({
    storage,
    workerClient,
    actorUserId: () => opts.actorUserId ?? uuid(900),
    now: () => new Date("2026-04-19T12:00:00Z"),
    backoffBaseMs: opts.backoffBaseMs ?? 5,
    backoffMaxMs: opts.backoffBaseMs ? opts.backoffBaseMs * 100 : 50,
    deliveredRetentionMs: opts.deliveredRetentionMs ?? 50_000,
    services: { messageService },
  });
  return { storage, service, messageService };
}

async function waitFor<T>(
  predicate: () => Promise<T | undefined> | T | undefined,
  timeoutMs = 1000,
): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = await predicate();
    if (v !== undefined && v !== null && v !== false) return v as T;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error(`waitFor: predicate did not resolve within ${timeoutMs}ms`);
}

describe("EventQueueService - submission and pre-flight", () => {
  it("rejects locally when validateContractorEvent fails (without enqueueing)", async () => {
    const worker = new FakeWorkerClient();
    const { service, storage } = createService(worker);

    const env = envelope(42, uuid(1));
    const startA = startedPayload(uuid(100));
    const startB = startedPayload(uuid(101), "2026-04-19T08:30:00Z");

    const r1 = await service.submitContractorEvent(env, startA);
    expect(r1.kind).toBe("accepted_locally");

    // Starting a 2nd primary timer while the first is still running must
    // be rejected by the shared validator (the worker would also reject;
    // we catch it pre-flight so the offline queue stays clean).
    const env2 = envelope(42, uuid(2));
    const r2 = await service.submitContractorEvent(env2, startB);
    expect(r2.kind).toBe("rejected_locally");
    if (r2.kind === "rejected_locally") {
      expect(r2.errors[0]?.code).toBe("entry.concurrent_timer");
    }

    expect(await storage.list()).toHaveLength(1);
  });

  it("dedups the same clientEventId on re-submit", async () => {
    const worker = new FakeWorkerClient();
    const { service } = createService(worker);
    const env = envelope(42, uuid(50));
    const r1 = await service.submitContractorEvent(env, startedPayload(uuid(200)));
    const r2 = await service.submitContractorEvent(env, startedPayload(uuid(200)));
    expect(r1.kind).toBe("accepted_locally");
    expect(r2.kind).toBe("duplicate");
  });

  it("preserves per-stream FIFO ordering when flushing", async () => {
    const worker = new FakeWorkerClient();
    worker.responses = [
      { kind: "accepted", stream: "contractor", seq: 1 },
      { kind: "accepted", stream: "contractor", seq: 2 },
    ];
    const { service } = createService(worker);

    const e1 = envelope(7, uuid(401));
    const e2 = envelope(7, uuid(402), "2026-04-19T09:30:00Z");
    await service.submitContractorEvent(e1, startedPayload(uuid(300)));
    await service.submitContractorEvent(e2, stoppedPayload(uuid(300)));

    await waitFor(() => worker.calls.length === 2);

    const sentIds = worker.calls.map((c) => c.envelope.clientEventId);
    expect(sentIds).toEqual([uuid(401), uuid(402)]);
  });
});

describe("EventQueueService - flush lifecycle", () => {
  it("transitions to delivered on accepted and emits a system effect", async () => {
    const worker = new FakeWorkerClient();
    worker.responses = [{ kind: "accepted", stream: "contractor", seq: 99 }];
    const { service, storage, messageService } = createService(worker);

    const seen: unknown[] = [];
    messageService.reportSystemEffect.subscribeToRequest((req) => {
      seen.push(req.request.scope);
      req.sendResponse();
    });

    await service.submitContractorEvent(
      envelope(7, uuid(601)),
      startedPayload(uuid(500)),
    );

    const rows = await waitFor(async () => {
      const r = await storage.list();
      return r[0]?.status === "delivered" ? r : undefined;
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].confirmedSeq).toBe(99);
    expect(seen).toEqual(["time-event"]);
  });

  it("requeues with backoff on transient_failure and retries automatically", async () => {
    const worker = new FakeWorkerClient();
    worker.responses = [
      { kind: "transient_failure", message: "offline" },
      { kind: "accepted", stream: "contractor", seq: 7 },
    ];
    const { service, storage } = createService(worker, { backoffBaseMs: 5 });

    await service.submitContractorEvent(
      envelope(7, uuid(701)),
      startedPayload(uuid(550)),
    );

    const delivered = await waitFor(async () => {
      const r = await storage.list();
      return r[0]?.status === "delivered" ? r[0] : undefined;
    });
    expect(delivered.confirmedSeq).toBe(7);
    expect(delivered.attempts).toBeGreaterThanOrEqual(2);
    expect(worker.calls).toHaveLength(2);
  });

  it("parks failed_validation rows for manual resolution and stops draining the stream", async () => {
    const worker = new FakeWorkerClient();
    worker.responses = [
      {
        kind: "validation_failed",
        errors: [
          {
            code: "entry.locked_by_period",
            message: "period is closed",
          },
        ],
      },
      // This second response must NEVER fire — the queue should stop after
      // the first failed_validation blocks the stream.
      { kind: "accepted", stream: "contractor", seq: 99 },
    ];
    const { service, storage } = createService(worker);

    const e1 = envelope(7, uuid(801));
    await service.submitContractorEvent(e1, startedPayload(uuid(560)));

    // Wait for the first event to be processed and parked. We have to
    // observe via the storage status because submit is synchronous in the
    // happy path.
    await waitFor(async () => {
      const r = await storage.list();
      return r[0]?.status === "failed_validation" ? true : undefined;
    });

    // Now enqueue a second event behind the parked head. Pre-flight
    // validates against the parked tail's pending fold (empty since the
    // failed row is excluded), so EntryStopped against an empty state
    // would itself be rejected. Use a second EntryStarted instead, which
    // *would* validate against an empty stream — what we're testing is
    // that the queue refuses to advance past the parked head.
    const e2 = envelope(7, uuid(802), "2026-04-19T09:30:00Z");
    await service.submitContractorEvent(e2, startedPayload(uuid(570)));

    // Trigger another flush; the FIFO head is failed_validation, so the
    // worker MUST NOT see the second event.
    await service.flushNow();
    await new Promise((r) => setTimeout(r, 30));

    const rows = await storage.list();
    expect(rows[0].status).toBe("failed_validation");
    expect(rows[1].status).toBe("pending");
    expect(worker.calls).toHaveLength(1);
  });
});

describe("EventQueueService - optimistic overlay helper", () => {
  it("folds queued events on top of an empty server snapshot", () => {
    const e1 = {
      seq: 1 as number,
      streamKind: "contractor" as const,
      streamKey: "contractor:7" as const,
      envelope: envelope(7, uuid(901)),
      payload: startedPayload(uuid(600)),
      status: "pending" as const,
      enqueuedAt: new Date(),
      attempts: 0,
      lastAttemptAt: null,
      confirmedSeq: null,
      lastError: null,
    };
    const state = applyPendingContractorEvents(null, [e1]);
    expect(state.contractorId).toBe(7);
    expect(state.entries[uuid(600)]).toBeDefined();
    expect(state.entries[uuid(600)].stoppedAt).toBeNull();
  });
});
