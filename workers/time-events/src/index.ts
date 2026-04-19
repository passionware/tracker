/**
 * Cloudflare Worker entry point — Hono app for the time-events service.
 *
 * Wiring:
 *   - In production / `wrangler dev` with secrets: builds a Supabase-backed
 *     `TimeEventStore` (TODO: not yet implemented; see store.supabase.ts
 *     placeholder).
 *   - In tests: tests use `buildApp(deps)` directly and pass an
 *     `InMemoryTimeEventStore`. They never hit Supabase.
 *
 * Routes:
 *   GET  /health
 *   POST /events                                          accepts contractor or project events
 *   GET  /streams/contractor/:contractorId/head
 *   GET  /streams/project/:projectId/head
 *   GET  /streams/project/:projectId/aggregate/:kind/:aggregateId/head
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  handleGetContractorHead,
  handleGetProjectAggregateHead,
  handleGetProjectHead,
} from "./handlers/get-streams.ts";
import { handlePostEvents } from "./handlers/post-events.ts";
import { AuthError, verifyJwt } from "./auth.ts";
import { InMemoryTimeEventStore } from "./store.in-memory.ts";
import type { TimeEventStore } from "./store.ts";
import type { ProjectAggregateKind } from "@/api/time-event/time-event.api.ts";

export interface Env {
  TIME_SCHEMA: "time_dev" | "time_prod";
  LOG_LEVEL?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_JWT_SECRET?: string;
}

export interface AppDeps {
  store: TimeEventStore;
  /** Resolves the caller from the request — defaults to `verifyJwt`. */
  resolveActor?: (req: Request) => Promise<{ actorUserId: string }>;
  /** Test seam for clock injection. */
  now?: () => Date;
}

/**
 * Build a Hono app from explicit deps. Tests use this directly; the default
 * fetch handler below builds production deps from `env`.
 */
export function buildApp(deps: AppDeps) {
  const app = new Hono();

  app.use("*", cors());

  app.get("/health", (c) =>
    c.json({ status: "ok", service: "tracker-time-events" }),
  );

  app.post("/events", async (c) => {
    const actor = await resolveActorOr401(deps, c.req.raw);
    if (actor instanceof Response) return actor;

    const rawBody = await c.req.json().catch(() => undefined);
    if (rawBody === undefined) {
      return c.json({ kind: "schema_invalid", issues: [{ message: "body must be JSON" }] }, 400);
    }

    const result = await handlePostEvents(
      { store: deps.store, actorUserId: actor.actorUserId, now: (deps.now ?? (() => new Date()))() },
      rawBody,
    );

    switch (result.kind) {
      case "accepted":
        return c.json(result, 201);
      case "duplicate":
        return c.json(result, 200);
      case "schema_invalid":
        return c.json(result, 400);
      case "validation_failed":
        return c.json(result, 422);
      case "concurrency_conflict":
        return c.json(result, 409);
    }
  });

  app.get("/streams/contractor/:contractorId/head", async (c) => {
    const actor = await resolveActorOr401(deps, c.req.raw);
    if (actor instanceof Response) return actor;
    const id = Number.parseInt(c.req.param("contractorId"), 10);
    if (!Number.isFinite(id) || id <= 0)
      return c.json({ error: "invalid contractorId" }, 400);
    return c.json(await handleGetContractorHead(deps.store, id));
  });

  app.get("/streams/project/:projectId/head", async (c) => {
    const actor = await resolveActorOr401(deps, c.req.raw);
    if (actor instanceof Response) return actor;
    const id = Number.parseInt(c.req.param("projectId"), 10);
    if (!Number.isFinite(id) || id <= 0)
      return c.json({ error: "invalid projectId" }, 400);
    return c.json(await handleGetProjectHead(deps.store, id));
  });

  app.get(
    "/streams/project/:projectId/aggregate/:kind/:aggregateId/head",
    async (c) => {
      const actor = await resolveActorOr401(deps, c.req.raw);
      if (actor instanceof Response) return actor;
      const projectId = Number.parseInt(c.req.param("projectId"), 10);
      const kind = c.req.param("kind") as ProjectAggregateKind;
      const aggregateId = c.req.param("aggregateId");
      if (!Number.isFinite(projectId) || projectId <= 0)
        return c.json({ error: "invalid projectId" }, 400);
      if (!["task", "activity", "rate", "period_lock"].includes(kind))
        return c.json({ error: "invalid aggregateKind" }, 400);
      return c.json(
        await handleGetProjectAggregateHead(
          deps.store,
          projectId,
          kind,
          aggregateId,
        ),
      );
    },
  );

  return app;
}

async function resolveActorOr401(
  deps: AppDeps,
  req: Request,
): Promise<{ actorUserId: string } | Response> {
  const resolver = deps.resolveActor;
  if (!resolver) {
    return new Response(
      JSON.stringify({ error: "actor resolver not configured" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
  try {
    return await resolver(req);
  } catch (e) {
    if (e instanceof AuthError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: e.status,
        headers: { "content-type": "application/json" },
      });
    }
    throw e;
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    // Default deps: in-memory store (so `wrangler dev` works out of the box)
    // until the Supabase-backed store ships.
    const store = new InMemoryTimeEventStore();
    const resolveActor = async (request: Request) => {
      if (!env.SUPABASE_ANON_JWT_SECRET) {
        // Dev convenience: when no secret is configured, accept a synthetic
        // user id from the `x-debug-actor` header so we can curl the worker.
        const hdr = request.headers.get("x-debug-actor");
        if (hdr) return { actorUserId: hdr };
        throw new AuthError(401, "SUPABASE_ANON_JWT_SECRET not configured");
      }
      return verifyJwt(
        request.headers.get("authorization") ?? undefined,
        env.SUPABASE_ANON_JWT_SECRET,
      );
    };
    const app = buildApp({ store, resolveActor });
    return app.fetch(req, env);
  },
};
