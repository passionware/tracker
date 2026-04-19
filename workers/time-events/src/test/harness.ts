/**
 * given/when/then style helpers for Worker integration tests. Tests do NOT
 * touch Supabase; they wire the Hono app to an `InMemoryTimeEventStore` so
 * each test owns an isolated stream space.
 *
 * Usage:
 *
 *   const t = createWorld();
 *   await t.given.contractorEvents(42, [...preEvents]);
 *   const res = await t.when.postEvent({ stream: "contractor", envelope, payload });
 *   t.then.expectAccepted(res);
 *   await t.then.expectContractorHead(42, 5);
 */

import { buildApp } from "../index.ts";
import { InMemoryTimeEventStore } from "../store.in-memory.ts";
import type {
  ContractorEventEnvelope,
  ContractorEventPayload,
  ProjectEventEnvelope,
  ProjectEventPayload,
} from "@/api/time-event/time-event.api.ts";

export interface TestActor {
  actorUserId: string;
}

export type TestPostBody =
  | {
      stream: "contractor";
      envelope: ContractorEventEnvelope;
      payload: ContractorEventPayload;
    }
  | {
      stream: "project";
      envelope: ProjectEventEnvelope;
      payload: ProjectEventPayload;
    };

export interface World {
  store: InMemoryTimeEventStore;
  actor: TestActor;
  given: {
    actor: (a: TestActor) => void;
    contractorEvents: (
      contractorId: number,
      events: Array<{
        envelope: ContractorEventEnvelope;
        payload: ContractorEventPayload;
      }>,
    ) => Promise<void>;
    projectEvents: (
      projectId: number,
      events: Array<{
        envelope: ProjectEventEnvelope;
        payload: ProjectEventPayload;
      }>,
    ) => Promise<void>;
  };
  when: {
    postEvent: (body: TestPostBody) => Promise<Response>;
    getContractorHead: (contractorId: number) => Promise<Response>;
    getProjectHead: (projectId: number) => Promise<Response>;
  };
  then: {
    expectStatus: (res: Response, status: number) => Promise<void>;
    expectAccepted: (res: Response) => Promise<{ seq: number }>;
    expectValidationError: (
      res: Response,
      code: string,
    ) => Promise<void>;
    expectContractorHead: (id: number, head: number) => Promise<void>;
  };
}

export function createWorld(opts: { now?: () => Date } = {}): World {
  let actor: TestActor = { actorUserId: "00000000-0000-4000-8000-000000000900" };
  const store = new InMemoryTimeEventStore({ now: opts.now });

  const app = buildApp({
    store,
    now: opts.now,
    resolveActor: async () => actor,
  });

  return {
    store,
    actor,
    given: {
      actor: (a) => {
        actor = a;
      },
      contractorEvents: async (contractorId, events) => {
        for (const e of events) {
          await store.appendContractorEvent({
            actorUserId: actor.actorUserId,
            envelope: { ...e.envelope, contractorId },
            payload: e.payload,
          });
        }
      },
      projectEvents: async (projectId, events) => {
        for (const e of events) {
          await store.appendProjectEvent({
            actorUserId: actor.actorUserId,
            envelope: { ...e.envelope, projectId },
            payload: e.payload,
          });
        }
      },
    },
    when: {
      postEvent: (body) =>
        Promise.resolve(
          app.request("/events", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }),
        ),
      getContractorHead: (contractorId) =>
        Promise.resolve(app.request(`/streams/contractor/${contractorId}/head`)),
      getProjectHead: (projectId) =>
        Promise.resolve(app.request(`/streams/project/${projectId}/head`)),
    },
    then: {
      expectStatus: async (res, status) => {
        if (res.status !== status) {
          const text = await res.clone().text();
          throw new Error(
            `expected status ${status}, got ${res.status}; body=${text}`,
          );
        }
      },
      expectAccepted: async (res) => {
        if (res.status !== 201) {
          const text = await res.clone().text();
          throw new Error(`expected 201 accepted, got ${res.status}; body=${text}`);
        }
        const body = (await res.json()) as {
          kind: string;
          event: { seq: number };
        };
        if (body.kind !== "accepted")
          throw new Error(`expected kind=accepted, got ${body.kind}`);
        return { seq: body.event.seq };
      },
      expectValidationError: async (res, code) => {
        if (res.status !== 422) {
          const text = await res.clone().text();
          throw new Error(`expected 422, got ${res.status}; body=${text}`);
        }
        const body = (await res.json()) as {
          kind: string;
          errors: Array<{ code: string }>;
        };
        if (!body.errors.some((e) => e.code === code)) {
          throw new Error(
            `expected validation code ${code}, got ${JSON.stringify(body.errors)}`,
          );
        }
      },
      expectContractorHead: async (id, head) => {
        const res = await app.request(`/streams/contractor/${id}/head`);
        if (res.status !== 200) throw new Error(`unexpected ${res.status}`);
        const body = (await res.json()) as { head: number };
        if (body.head !== head)
          throw new Error(`expected head=${head}, got ${body.head}`);
      },
    },
  };
}

// ─── tiny fixture helpers ────────────────────────────────────────────────────

export const uuid = (n: number): string =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const makeEnvelope = (
  contractorId: number,
  clientEventId: string,
  occurredAt: string,
): ContractorEventEnvelope => ({
  clientEventId,
  correlationId: uuid(900),
  occurredAt,
  contractorId,
  eventVersion: 1,
});

export const makeProjectEnvelope = (
  projectId: number,
  aggregateKind: ProjectEventEnvelope["aggregateKind"],
  aggregateId: string,
  clientEventId: string,
  occurredAt: string,
): ProjectEventEnvelope => ({
  clientEventId,
  correlationId: uuid(900),
  occurredAt,
  projectId,
  aggregateKind,
  aggregateId,
  eventVersion: 1,
});
