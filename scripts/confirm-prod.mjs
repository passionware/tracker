#!/usr/bin/env node
/**
 * Guard for production migration scripts.
 *
 * Refuses to proceed unless TIME_MIGRATE_CONFIRM=yes is set in the environment.
 * Wired into npm scripts that target time_prod (e.g. `migrate:time:prod`)
 * so a typo'd command can never silently mutate production.
 *
 * Usage:
 *   TIME_MIGRATE_CONFIRM=yes npm run migrate:time:prod
 */

const confirm = process.env.TIME_MIGRATE_CONFIRM;

if (confirm !== "yes") {
  process.stderr.write(
    [
      "",
      "  Refusing to run a production migration without an explicit confirmation.",
      "",
      "  Re-run with:",
      "",
      "    TIME_MIGRATE_CONFIRM=yes <your command>",
      "",
      "  This guard is intentional. It prevents accidental writes to time_prod.",
      "",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

process.stdout.write("[confirm-prod] TIME_MIGRATE_CONFIRM=yes — proceeding.\n");
