#!/usr/bin/env node
/**
 * Thin wrapper around `dbmate` for the time_dev / time_prod schemas.
 *
 * Why a wrapper instead of inlining everything in package.json?
 *   - Centralizes the URL + search_path + --migrations-table wiring.
 *   - Validates env vars and emits a friendly error instead of letting dbmate
 *     fail with a cryptic "DATABASE_URL not set".
 *   - Injects `SET search_path TO <schema>, ...;` into every migration so the
 *     same migration files apply cleanly through the Supabase pooler (see
 *     "Supabase pooler quirk" below).
 *   - Keeps the npm scripts in package.json short and readable.
 *
 * Supabase pooler quirk (very important):
 *   Supavisor (Supabase's pooler) silently strips both the libpq `options=`
 *   URL parameter AND the PGOPTIONS env var at startup, on BOTH the session
 *   pooler (port 5432) and the transaction pooler (port 6543). That means
 *   `?options=-c%20search_path%3Dtime_dev` does NOTHING when the URL points
 *   at `*.pooler.supabase.com`. The only reliable way to set search_path
 *   through the pooler is to issue `SET search_path TO ...` as a SQL
 *   statement after connection.
 *
 *   This wrapper handles that for you: it copies each migration file to a
 *   temp directory and injects
 *     SET search_path TO <schema>, public, extensions, pg_catalog;
 *   immediately after the `-- migrate:up` and `-- migrate:down` markers.
 *   dbmate then runs against the temp directory. The original files in
 *   `supabase/time_migrations/` stay schema-agnostic.
 *
 *   The bootstrap step (CREATE SCHEMA) and dbmate's own `schema_migrations`
 *   tracking are unaffected — they use schema-qualified names.
 *
 *   For direct connections (`db.<PROJECT>.supabase.co:5432`) this is just
 *   redundant — `SET` is harmless and idempotent.
 *
 * Usage:
 *   node scripts/dbmate-time.mjs <env> <dbmate-subcommand> [...args]
 *
 *   <env>  one of: dev | prod | new
 *   For `new`: no env / DB connection required, just creates a timestamped
 *              migration file with the dbmate up/down markers.
 *   For `dev` / `prod`: requires the matching TIME_<ENV>_DATABASE_URL env var.
 *
 * Examples:
 *   node scripts/dbmate-time.mjs new add_event_store
 *   node scripts/dbmate-time.mjs dev up
 *   node scripts/dbmate-time.mjs dev status
 *   node scripts/dbmate-time.mjs prod up   # requires TIME_MIGRATE_CONFIRM=yes
 *
 * The `migrate:time:*` npm scripts are the canonical way to invoke this.
 * Direct invocation works the same.
 */

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import dotenv from "dotenv";

// Load env files the same way Vite does for the dev server, so
// `npm run migrate:time:*` picks up TIME_*_DATABASE_URL from .env.local
// without forcing the user to also export them in their shell.
// `override: false` means a value already set in process.env (e.g. exported
// in CI or the current shell) takes precedence over the file.
dotenv.config({ path: ".env.local", override: false, quiet: true });
dotenv.config({ path: ".env", override: false, quiet: true });

const MIGRATIONS_DIR = "supabase/time_migrations";

const args = process.argv.slice(2);
const envName = args[0];
const dbmateArgs = args.slice(1);

if (!envName || !["dev", "prod", "new"].includes(envName)) {
  fail(
    `Usage: node scripts/dbmate-time.mjs <dev|prod|new> <dbmate-subcommand> [...args]`,
  );
}

assertDbmateInstalled();

if (!existsSync(MIGRATIONS_DIR)) {
  fail(
    `Migrations directory "${MIGRATIONS_DIR}" not found. Did your checkout finish?`,
  );
}

if (envName === "new") {
  // `new` operates on the source dir directly (it WRITES a file).
  const status = runDbmate([
    "--migrations-dir",
    MIGRATIONS_DIR,
    "new",
    ...dbmateArgs,
  ]);
  process.exit(status);
}

const schema = envName === "dev" ? "time_dev" : "time_prod";
const urlVar =
  envName === "dev" ? "TIME_DEV_DATABASE_URL" : "TIME_PROD_DATABASE_URL";
const databaseUrl = process.env[urlVar];

if (!databaseUrl) {
  fail(
    [
      `${urlVar} is not set.`,
      ``,
      `Set it in .env.local (gitignored) or your shell, e.g.`,
      ``,
      `  ${urlVar}="postgres://USER:PASS@HOST:5432/postgres?sslmode=require"`,
      ``,
      `Get the connection string from Supabase -> Project Settings -> Database`,
      `(URI form, sslmode=require). The "?options=-c search_path=..." suffix`,
      `is NOT needed — the wrapper sets search_path inside each migration.`,
    ].join("\n"),
  );
}

// dbmate's first action is to create its own schema_migrations tracking
// table inside the schema-qualified --migrations-table. If the schema itself
// doesn't exist yet, that fails. Bootstrap it idempotently here so first-run
// "just works" without manual SQL.
bootstrapSchema(databaseUrl, schema);

// Preprocess migrations to inject `SET search_path` after the up/down markers.
// (See the "Supabase pooler quirk" block at the top of this file.)
const effectiveDir = preprocessMigrations(MIGRATIONS_DIR, schema);
let exitCode = 1;
try {
  exitCode = runDbmate(
    [
      "--migrations-dir",
      effectiveDir,
      // Schema-qualify the tracking table so it lives inside time_dev /
      // time_prod alongside the migrated objects, instead of leaking into
      // public. dbmate has no dedicated "--migrations-table-schema" flag;
      // the supported convention is "<schema>.schema_migrations".
      "--migrations-table",
      `${schema}.schema_migrations`,
      "--no-dump-schema",
      ...dbmateArgs,
    ],
    { DATABASE_URL: databaseUrl },
  );
} finally {
  rmSync(effectiveDir, { recursive: true, force: true });
}
process.exit(exitCode);

function preprocessMigrations(srcDir, targetSchema) {
  const tmp = mkdtempSync(path.join(tmpdir(), `dbmate-time-${targetSchema}-`));
  // public + extensions kept on the path so cross-schema references (e.g.
  // pgcrypto's gen_random_uuid in older Postgres, public reference data)
  // still resolve. pg_catalog is on first by Postgres convention but we keep
  // it explicit for clarity.
  const setLine = `SET search_path TO ${targetSchema}, public, extensions, pg_catalog;`;

  for (const name of readdirSync(srcDir)) {
    const src = path.join(srcDir, name);
    const dst = path.join(tmp, name);
    if (name.endsWith(".sql")) {
      const original = readFileSync(src, "utf8");
      writeFileSync(dst, injectSearchPath(original, setLine));
    } else {
      copyFileSync(src, dst);
    }
  }
  return tmp;
}

function injectSearchPath(content, setLine) {
  // dbmate recognizes `-- migrate:up` and `-- migrate:down` as section
  // markers (line-anchored). Inject our SET right after each marker so the
  // session search_path is correct for both forward and rollback runs.
  // If a marker isn't present we leave the file alone — dbmate would refuse
  // it anyway, and silently injecting could mask the underlying problem.
  let out = content;
  out = out.replace(/^(-- migrate:up\b[^\n]*\n)/m, `$1${setLine}\n`);
  out = out.replace(/^(-- migrate:down\b[^\n]*\n)/m, `$1${setLine}\n`);
  return out;
}

function bootstrapSchema(databaseUrl, targetSchema) {
  const probe = spawnSync("psql", ["--version"], { stdio: "pipe" });
  if (probe.error || probe.status !== 0) {
    fail(
      [
        `psql is not installed or not on PATH (needed once, to create the "${targetSchema}" schema if missing).`,
        ``,
        `Either:`,
        `  - Install psql:  brew install libpq && brew link --force libpq`,
        `                   (or apt install postgresql-client)`,
        `  - OR run this once manually in the Supabase SQL editor:`,
        ``,
        `      CREATE SCHEMA IF NOT EXISTS ${targetSchema};`,
        ``,
        `Then re-run.`,
      ].join("\n"),
    );
  }

  const result = spawnSync(
    "psql",
    [
      databaseUrl,
      "-v",
      "ON_ERROR_STOP=1",
      "-q",
      "-c",
      `CREATE SCHEMA IF NOT EXISTS ${targetSchema}`,
    ],
    { stdio: "pipe" },
  );
  if (result.status !== 0) {
    fail(
      [
        `Failed to bootstrap schema "${targetSchema}" via psql (exit ${result.status}).`,
        `stderr: ${result.stderr?.toString().trim()}`,
        ``,
        `Check your connection string (network reachability, credentials).`,
      ].join("\n"),
    );
  }
}

function runDbmate(passArgs, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  const result = spawnSync("dbmate", passArgs, { stdio: "inherit", env });
  if (result.error) fail(`Failed to invoke dbmate: ${result.error.message}`);
  return result.status ?? 1;
}

function assertDbmateInstalled() {
  const probe = spawnSync("dbmate", ["--version"], { stdio: "pipe" });
  if (probe.error || probe.status !== 0) {
    fail(
      [
        `dbmate is not installed or not on PATH.`,
        ``,
        `Install it (pinned version v2.32.0 — see README.md "Database migrations"):`,
        `  macOS:  brew install dbmate`,
        `  Linux:  see https://github.com/amacneil/dbmate#installation`,
        ``,
        `Then re-run.`,
      ].join("\n"),
    );
  }
}

function fail(msg) {
  process.stderr.write(`\n[dbmate-time] ${msg}\n\n`);
  process.exit(1);
}
