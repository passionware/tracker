#!/usr/bin/env -S npx tsx
/**
 * Phase B equivalence check for the event-sourced time-tracking stack.
 *
 * Replays the `day-scenario` fixture through:
 *
 *   1. the TypeScript reducers (`applyProjectEvent` / `applyContractorEvent`)
 *      — this is the same path `day-scenario.test.ts` exercises in Phase A;
 *   2. the SQL projection triggers that back `time_dev.entry`, via the
 *      `append_contractor_event` / `append_project_event` RPCs, executed
 *      through `psql` so we can also wipe+reset the event store in the
 *      same transaction.
 *
 * Then it diffs the two projections. The golden shape matches
 * `projectionFromContractorState` in `day-scenario.test.ts` — drop deleted
 * rows, sort by `startedAt`, surface only the fields we commit to keep
 * in sync between the two surfaces.
 *
 * Scope + safety:
 *   - Dev-only. Operates against `TIME_DEV_DATABASE_URL` (same env as
 *     `migrate:time:dev`). There is no `prod` target on purpose — this
 *     script truncates event rows.
 *   - Wipes only data for the fixture's contractor and project, so other
 *     streams in the dev DB survive.
 *   - Re-enables the append-only guard trigger even on early exit (the
 *     wipe SQL is idempotent, so an aborted run is safe to re-run).
 *
 * Usage:
 *   npm run projection:equivalence:dev
 *
 * Exit code 0 = projections match; 1 = diff detected or infra error.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import {
  FIXTURE_ACTOR_USER_ID,
  FIXTURE_CONTRACTOR_EVENTS,
  FIXTURE_CONTRACTOR_ID,
  FIXTURE_PROJECT_EVENTS,
  FIXTURE_PROJECT_ID,
  type ContractorFixtureEvent,
  type ProjectFixtureEvent,
} from "../src/api/time-event/aggregates/day-scenario.fixture.ts";
import {
  applyContractorEvent,
  emptyContractorStreamState,
  type ContractorStreamState,
  type EntryState,
} from "../src/api/time-event/aggregates/contractor-stream.ts";

// Env loading mirrors dbmate-time.mjs so this script is drop-in on the
// same dev machine without needing to export TIME_DEV_DATABASE_URL.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
dotenv.config({
  path: path.join(REPO_ROOT, ".env.local"),
  override: false,
  quiet: true,
});
dotenv.config({
  path: path.join(REPO_ROOT, ".env"),
  override: false,
  quiet: true,
});

const SCHEMA = "time_dev";
const DATABASE_URL = process.env.TIME_DEV_DATABASE_URL;

if (!DATABASE_URL) {
  fail(
    [
      "TIME_DEV_DATABASE_URL is not set.",
      "",
      "This is the same connection string `migrate:time:dev` uses — see",
      "scripts/dbmate-time.mjs for setup instructions.",
    ].join("\n"),
  );
}

assertPsqlInstalled();

// ---------------------------------------------------------------------------
// TS side: replay fixture through reducers, derive golden projection rows.
// ---------------------------------------------------------------------------

interface GoldenRow {
  entryId: string;
  projectId: number;
  taskId: string | null;
  startedAt: string;
  stoppedAt: string | null;
  approvalState: EntryState["approvalState"];
  description: string | null;
  interruptedEntryId: string | null;
  isPlaceholder: boolean;
}

function tsGolden(): GoldenRow[] {
  let state: ContractorStreamState = emptyContractorStreamState;
  for (const ev of FIXTURE_CONTRACTOR_EVENTS) {
    state = applyContractorEvent(state, ev.payload, {
      occurredAt: ev.occurredAt,
      contractorId: FIXTURE_CONTRACTOR_ID,
    });
  }
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

// ---------------------------------------------------------------------------
// SQL side: build a single script that wipes + seeds + reads back.
// ---------------------------------------------------------------------------

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlJson(value: unknown): string {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

/**
 * Deterministic UUID factory. `append_*_event` RPCs type both
 * `p_client_event_id` and `p_correlation_id` as `uuid`, so we can't use
 * human-readable strings. Mint stable UUIDs keyed by bucket + index so
 * reruns on a wiped DB produce byte-identical rows (useful for diffing
 * the event table too, not just the projections).
 */
function fixtureUuid(bucket: number, idx: number): string {
  const tail = `${String(bucket).padStart(4, "0")}${String(idx).padStart(8, "0")}`;
  return `00000000-0000-4000-8000-${tail}`;
}

function appendProjectEventCall(ev: ProjectFixtureEvent, seq: number): string {
  return [
    `PERFORM append_project_event(`,
    `  p_project_id := ${FIXTURE_PROJECT_ID}::bigint,`,
    `  p_aggregate_kind := ${sqlLiteral(ev.aggregateKind)},`,
    `  p_aggregate_id := ${sqlLiteral(ev.aggregateId)}::uuid,`,
    `  p_type := ${sqlLiteral(ev.payload.type)},`,
    `  p_payload := ${sqlJson(ev.payload)},`,
    `  p_client_event_id := ${sqlLiteral(fixtureUuid(1000, seq))}::uuid,`,
    `  p_actor_user_id := ${sqlLiteral(FIXTURE_ACTOR_USER_ID)}::uuid,`,
    `  p_correlation_id := ${sqlLiteral(fixtureUuid(2000, seq))}::uuid,`,
    `  p_causation_id := NULL,`,
    `  p_event_version := 1,`,
    `  p_expected_aggregate_version := NULL`,
    `);`,
  ].join("\n");
}

function appendContractorEventCall(
  ev: ContractorFixtureEvent,
  seq: number,
): string {
  return [
    `PERFORM append_contractor_event(`,
    `  p_contractor_id := ${FIXTURE_CONTRACTOR_ID}::bigint,`,
    `  p_type := ${sqlLiteral(ev.payload.type)},`,
    `  p_payload := ${sqlJson(ev.payload)},`,
    `  p_client_event_id := ${sqlLiteral(fixtureUuid(3000, seq))}::uuid,`,
    `  p_actor_user_id := ${sqlLiteral(FIXTURE_ACTOR_USER_ID)}::uuid,`,
    `  p_correlation_id := ${sqlLiteral(fixtureUuid(4000, seq))}::uuid,`,
    `  p_causation_id := NULL,`,
    `  p_event_version := 1,`,
    `  p_expected_stream_version := NULL`,
    `);`,
  ].join("\n");
}

function buildSeedSql(): string {
  const projectCalls = FIXTURE_PROJECT_EVENTS.map((ev, i) =>
    appendProjectEventCall(ev, i + 1),
  ).join("\n\n");
  const contractorCalls = FIXTURE_CONTRACTOR_EVENTS.map((ev, i) =>
    appendContractorEventCall(ev, i + 1),
  ).join("\n\n");

  // Reset just the fixture's slice of the event store and its projections.
  // The `*_no_delete` triggers (backed by `reject_event_mutation`) normally
  // block DELETE on the event tables; we disable them for the duration of
  // the wipe only. PL/pgSQL's sub-transaction semantics auto-revert the
  // DISABLE on exception, but we also re-enable explicitly on success to
  // make the intent clear at the source.
  return [
    `SET search_path TO ${SCHEMA}, public, extensions, pg_catalog;`,
    ``,
    `DO $$`,
    `BEGIN`,
    `  ALTER TABLE contractor_event DISABLE TRIGGER contractor_event_no_delete;`,
    `  ALTER TABLE project_event DISABLE TRIGGER project_event_no_delete;`,
    `  DELETE FROM entry WHERE contractor_id = ${FIXTURE_CONTRACTOR_ID} OR project_id = ${FIXTURE_PROJECT_ID};`,
    `  DELETE FROM task_current WHERE project_id = ${FIXTURE_PROJECT_ID};`,
    `  DELETE FROM activity_current WHERE project_id = ${FIXTURE_PROJECT_ID};`,
    `  DELETE FROM rate_current WHERE project_id = ${FIXTURE_PROJECT_ID};`,
    `  DELETE FROM period_lock WHERE contractor_id = ${FIXTURE_CONTRACTOR_ID};`,
    `  DELETE FROM contractor_event WHERE contractor_id = ${FIXTURE_CONTRACTOR_ID};`,
    `  DELETE FROM project_event WHERE project_id = ${FIXTURE_PROJECT_ID};`,
    `  ALTER TABLE contractor_event ENABLE TRIGGER contractor_event_no_delete;`,
    `  ALTER TABLE project_event ENABLE TRIGGER project_event_no_delete;`,
    `END $$;`,
    ``,
    `DO $$`,
    `BEGIN`,
    projectCalls,
    ``,
    contractorCalls,
    `END $$;`,
  ].join("\n");
}

function buildReadSql(): string {
  // One-row JSON blob so we can parse a single stdout payload from psql
  // without worrying about CSV quoting or NULL sentinels. The column list
  // here is the SQL-side equivalent of `projectionFromContractorState`.
  return [
    `SET search_path TO ${SCHEMA}, public, extensions, pg_catalog;`,
    `SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r."startedAt"), '[]'::json)`,
    `FROM (`,
    `  SELECT`,
    `    id            AS "entryId",`,
    `    project_id    AS "projectId",`,
    `    task_id       AS "taskId",`,
    `    started_at    AS "startedAt",`,
    `    stopped_at    AS "stoppedAt",`,
    `    approval_state AS "approvalState",`,
    `    description,`,
    `    interrupted_entry_id AS "interruptedEntryId",`,
    `    is_placeholder AS "isPlaceholder"`,
    `  FROM entry`,
    `  WHERE contractor_id = ${FIXTURE_CONTRACTOR_ID}`,
    `    AND deleted_at IS NULL`,
    `) r;`,
  ].join("\n");
}

function runPsql(sql: string, opts: { captureStdout?: boolean } = {}): string {
  // Write the script to a temp file rather than passing it via `-c` or
  // stdin: `-c` requires a single statement, and stdin mode hides errors
  // behind psql's default ON_ERROR_STOP=0. The `-f` path combined with
  // ON_ERROR_STOP=1 makes any failure blow up immediately.
  const tmp = mkdtempSync(path.join(tmpdir(), "pe-time-"));
  const scriptPath = path.join(tmp, "script.sql");
  writeFileSync(scriptPath, sql);
  try {
    const args = [
      DATABASE_URL!,
      "-v",
      "ON_ERROR_STOP=1",
      "-q",
      "-f",
      scriptPath,
    ];
    if (opts.captureStdout) {
      args.push("-At"); // unaligned + tuples-only → clean single line
    }
    const result = spawnSync("psql", args, {
      stdio: opts.captureStdout
        ? ["ignore", "pipe", "inherit"]
        : ["ignore", "inherit", "inherit"],
    });
    if (result.status !== 0) {
      fail(`psql exited with code ${result.status ?? "?"}`);
    }
    return opts.captureStdout ? result.stdout.toString() : "";
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function sqlGolden(): GoldenRow[] {
  const out = runPsql(buildReadSql(), { captureStdout: true });
  const trimmed = out.trim();
  if (!trimmed) return [];
  return JSON.parse(trimmed) as GoldenRow[];
}

// ---------------------------------------------------------------------------
// Diff + reporting.
// ---------------------------------------------------------------------------

/**
 * Treat timestamp strings as instants — Postgres returns
 * `"2026-04-19T08:00:00+00:00"` while TS payload timestamps are
 * `"2026-04-19T08:00:00Z"` and `Date#toISOString()` emits
 * `"2026-04-19T09:55:00.000Z"`. All three represent the same instant;
 * ISO string equality would spuriously flag them as diffs.
 */
function normalizeInstant(value: string | null): string | null {
  if (value === null) return null;
  const ms = Date.parse(value);
  if (Number.isNaN(ms))
    throw new Error(`Not a valid timestamp: ${JSON.stringify(value)}`);
  return new Date(ms).toISOString();
}

function normalizeRow(row: GoldenRow): GoldenRow {
  return {
    ...row,
    startedAt: normalizeInstant(row.startedAt) ?? row.startedAt,
    stoppedAt: normalizeInstant(row.stoppedAt),
  };
}

function diff(ts: GoldenRow[], sql: GoldenRow[]): string[] {
  const diffs: string[] = [];
  const normTs = ts.map(normalizeRow);
  const normSql = sql.map(normalizeRow);

  if (normTs.length !== normSql.length) {
    diffs.push(
      `row count: ts=${normTs.length} sql=${normSql.length}`,
    );
  }
  const rows = Math.max(normTs.length, normSql.length);
  for (let i = 0; i < rows; i++) {
    const a = normTs[i];
    const b = normSql[i];
    if (!a) {
      diffs.push(`row ${i}: missing on TS side (SQL has ${b?.entryId})`);
      continue;
    }
    if (!b) {
      diffs.push(`row ${i}: missing on SQL side (TS has ${a.entryId})`);
      continue;
    }
    const fields: (keyof GoldenRow)[] = [
      "entryId",
      "projectId",
      "taskId",
      "startedAt",
      "stoppedAt",
      "approvalState",
      "description",
      "interruptedEntryId",
      "isPlaceholder",
    ];
    for (const field of fields) {
      if (a[field] !== b[field]) {
        diffs.push(
          `row ${i} (${a.entryId}) field "${field}": ts=${JSON.stringify(a[field])} sql=${JSON.stringify(b[field])}`,
        );
      }
    }
  }
  return diffs;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("[projection-equivalence] seeding day-scenario into", SCHEMA);
  runPsql(buildSeedSql());
  console.log("[projection-equivalence] reading back projection rows");
  const sql = sqlGolden();
  const ts = tsGolden();

  console.log(
    `[projection-equivalence] ts=${ts.length} row(s), sql=${sql.length} row(s)`,
  );

  const diffs = diff(ts, sql);
  if (diffs.length === 0) {
    console.log("[projection-equivalence] \u2713 projections match");
    return;
  }

  console.error("[projection-equivalence] \u2717 projections diverge:");
  for (const line of diffs) console.error("  - " + line);
  console.error("\nTS golden:");
  console.error(JSON.stringify(ts.map(normalizeRow), null, 2));
  console.error("\nSQL golden:");
  console.error(JSON.stringify(sql.map(normalizeRow), null, 2));
  process.exit(1);
}

function assertPsqlInstalled() {
  const probe = spawnSync("psql", ["--version"], { stdio: "pipe" });
  if (probe.error || probe.status !== 0) {
    fail(
      "psql is not installed or not on PATH (same requirement as migrate:time:*).",
    );
  }
}

function fail(msg: string): never {
  process.stderr.write(`\n[projection-equivalence] ${msg}\n\n`);
  process.exit(1);
}

// Keep top-level await off for Node compatibility; run async main().
main().catch((e) => {
  console.error("[projection-equivalence] unexpected error:", e);
  process.exit(1);
});
