#!/usr/bin/env node
/**
 * Thin wrapper around `dbmate` for the time_dev / time_prod schemas.
 *
 * Why a wrapper instead of inlining everything in package.json?
 *   - Centralizes the URL + search_path + --migrations-table-schema wiring.
 *   - Validates env vars and emits a friendly error instead of letting dbmate
 *     fail with a cryptic "DATABASE_URL not set".
 *   - Keeps the npm scripts in package.json short and readable.
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
import { existsSync } from "node:fs";

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
  runDbmate(["--migrations-dir", MIGRATIONS_DIR, "new", ...dbmateArgs]);
} else {
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
        `  ${urlVar}="postgres://USER:PASS@HOST:5432/postgres?sslmode=require&options=-c%20search_path%3D${schema}"`,
        ``,
        `Get the connection string from Supabase -> Project Settings -> Database`,
        `(URI form, sslmode=require). Append "&options=-c%20search_path%3D${schema}".`,
      ].join("\n"),
    );
  }

  if (
    !databaseUrl.includes(`search_path%3D${schema}`) &&
    !databaseUrl.includes(`search_path=${schema}`)
  ) {
    fail(
      [
        `${urlVar} does not pin search_path to "${schema}".`,
        ``,
        `Append the following query parameter to the URL:`,
        ``,
        `  &options=-c%20search_path%3D${schema}`,
        ``,
        `This ensures unqualified table names in migrations resolve into the right schema.`,
      ].join("\n"),
    );
  }

  runDbmate(
    [
      "--migrations-dir",
      MIGRATIONS_DIR,
      "--migrations-table-schema",
      schema,
      "--no-dump-schema",
      ...dbmateArgs,
    ],
    { DATABASE_URL: databaseUrl },
  );
}

function runDbmate(passArgs, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  const result = spawnSync("dbmate", passArgs, { stdio: "inherit", env });
  if (result.error) fail(`Failed to invoke dbmate: ${result.error.message}`);
  process.exit(result.status ?? 1);
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
