# `tracker-time-events` — Cloudflare Worker

Authoritative ingestion endpoint for the event-sourced time-tracking system.

## Layout

```
workers/time-events/
├── package.json          npm-workspace package (dep on @cloudflare/* + hono)
├── wrangler.toml         dev + prod environments (TIME_SCHEMA differs)
├── tsconfig.json         path alias @/* -> ../../src/*  (shares src/api/time-event)
├── vitest.config.ts      uses @cloudflare/vitest-pool-workers
├── src/
│   ├── index.ts          Hono app + default fetch handler
│   ├── auth.ts           HS256 JWT verification (sub claim → actorUserId)
│   ├── store.ts          TimeEventStore interface + concurrency / dedup errors
│   ├── store.in-memory.ts dev/test implementation; folds events through the
│                          shared TS reducers on every read
│   ├── handlers/
│   │   ├── post-events.ts  the validation pipeline (schema → validator → append)
│   │   └── get-streams.ts   head/version reads for the offline queue
│   └── test/harness.ts    given/when/then helpers wired to InMemoryTimeEventStore
└── test/
    └── post-events.spec.ts  6+ vitest cases covering happy path, schema reject,
                              concurrent-timer rule, idempotent retry,
                              period-lock cross-stream rejection
```

## Pipeline (mirrors the design doc)

1. Parse + Zod-validate the request body (`postEventsBodySchema`).
2. `auth.verifyJwt(...)` → `actorUserId`.
3. `store.loadContractorStream(...)` (or project stream) → snapshot.
4. `validateContractorEvent` / `validateProjectEvent` from
   `src/api/time-event/aggregates` → `Result<{ok}, ValidationError[]>`.
5. `store.appendContractorEvent(...)` (or project) — server stamps `seq`,
   `eventId`, `receivedAt`. Maps:
   - `StoreDuplicateClientEventError` → `200 { kind: "duplicate", existingSeq }`
   - `StoreConcurrencyError` → `409 { kind: "concurrency_conflict" }`
6. Otherwise `201 { kind: "accepted", event: {...} }`.

## Local dev

```bash
# from the repo root, hoisted via npm workspaces:
npm install                       # picks up workers/time-events deps
npm run worker:time-events:dev    # → wrangler dev (uses InMemoryTimeEventStore)
npm run worker:time-events:test
```

By default `wrangler dev` uses `InMemoryTimeEventStore` (no Supabase
required). There are two auth modes for local dev:

1. **With a real Supabase JWT (what the SPA does).** Copy
   `.dev.vars.example` → `.dev.vars` (git-ignored) and set
   `SUPABASE_ANON_JWT_SECRET` to the value from Supabase Dashboard →
   Project Settings → API → "JWT Settings" → JWT Secret. Wrangler will
   load it automatically on the next `wrangler dev` restart. The worker
   then HS256-verifies the `Authorization: Bearer …` header sent by
   `time-events-worker-client.http.ts`.

2. **Curl shortcut.** Leave `SUPABASE_ANON_JWT_SECRET` unset and send
   `x-debug-actor: <uuid>` instead — the dev resolver in `src/index.ts`
   falls back to that header. Useful for ad-hoc curl, but the SPA won't
   hit this path because it always sends `Authorization`.

If you see `SUPABASE_ANON_JWT_SECRET not configured` in the browser,
you're hitting path (1) without the secret set — copy the
`.dev.vars.example` file and restart the worker.

## Production wiring (TODO, not in this round)

- `src/store.supabase.ts` — implements `TimeEventStore` against the
  `time_dev` / `time_prod` schemas. Uses `SUPABASE_SERVICE_ROLE_KEY` to write
  past RLS, with `SET search_path TO ${TIME_SCHEMA}, public, extensions,
  pg_catalog;` per query.
- Secrets:
  ```bash
  wrangler secret put SUPABASE_URL
  wrangler secret put SUPABASE_SERVICE_ROLE_KEY
  wrangler secret put SUPABASE_ANON_JWT_SECRET
  ```
- Deploy: `npm run worker:time-events:deploy:dev`.
