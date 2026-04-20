# Tracker

A Passionware in-house tool for time tracking, billing, and project ops. Built
on React + TypeScript + Vite, with Supabase Postgres as the primary database.

---

## Database migrations

Two migration systems live in this repo:

| Folder                                  | Tool used to apply        | Schemas it owns                |
| --------------------------------------- | ------------------------- | ------------------------------ |
| `supabase/migrations/`                  | Manual (Supabase web SQL editor) — current legacy flow | `dev`, `public` |
| `supabase/client_cockpit_migrations/`   | Manual (Supabase web SQL editor) — current legacy flow | `client_cockpit_*`            |
| `supabase/time_migrations/`             | **dbmate** via `npm run migrate:time:*` | `time_dev`, `time_prod`        |

The new `time_*` schemas are managed by [dbmate](https://github.com/amacneil/dbmate)
— a single-binary, language-agnostic SQL migration runner. Once the new flow is
proven, the other migration folders will be brought onto the same tool in a
follow-up.

### Installing dbmate

Pinned version: **v2.32.0** (verify with `dbmate --version`).

- **macOS:** `brew install dbmate`
- **Linux:**
  ```sh
  sudo curl -fsSL -o /usr/local/bin/dbmate \
    https://github.com/amacneil/dbmate/releases/download/v2.32.0/dbmate-linux-amd64
  sudo chmod +x /usr/local/bin/dbmate
  ```
- **CI:** install in the workflow with the same one-liner above.

The npm scripts probe `dbmate --version` and emit a friendly install hint if
it's missing — you'll know immediately.

### Connection strings

dbmate connects directly to Postgres (not via the Supabase REST API). Get the
URI from **Supabase → Project Settings → Database → Connection string** (URI
mode, `sslmode=require`).

Store the URLs in `.env.local` (gitignored via `*.local`):

```sh
TIME_DEV_DATABASE_URL="postgres://USER:PASS@HOST:5432/postgres?sslmode=require"
TIME_PROD_DATABASE_URL="postgres://USER:PASS@HOST:5432/postgres?sslmode=require"
```

The wrapper script (`scripts/dbmate-time.mjs`) decides which schema to target
from the CLI argument (`dev` → `time_dev`, `prod` → `time_prod`) and injects
`SET search_path TO <schema>, public, extensions, pg_catalog;` into every
migration before passing it to dbmate. The migration files in
`supabase/time_migrations/` stay schema-agnostic.

> **Why the injection?** Supabase's pooler (Supavisor) silently strips the
> libpq `options=` URL parameter and the `PGOPTIONS` env var on **both** the
> session pooler (port 5432) and the transaction pooler (port 6543), so
> `?options=-c%20search_path%3Dtime_dev` does nothing through `*.pooler.supabase.com`.
> The only reliable way to set `search_path` over the pooler is to issue
> `SET search_path TO ...` as an actual SQL statement after connection, which
> the wrapper does for you. (Direct connections via
> `db.<PROJECT>.supabase.co:5432` honor `options=`; the wrapper's injection
> is harmless and idempotent there.)

You can use any of these endpoints — the wrapper works the same way against
all of them — but **never** pick the transaction pooler (port `6543` /
`?pgbouncer=true`) because it doesn't support session-level state at all and
you'll lose `SET search_path` between statements. Use the **session pooler**
(port `5432`) or the **direct connection**.

### Workflow

| Command                            | What it does                                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `npm run migrate:time:new <slug>`  | Creates `supabase/time_migrations/<timestamp>_<slug>.sql` with the dbmate `-- migrate:up` / `-- migrate:down` markers. |
| `npm run migrate:time:status`      | Shows pending/applied migrations against `time_dev`.                                                                  |
| `npm run migrate:time:dev`         | Applies all pending migrations to `time_dev`.                                                                         |
| `npm run migrate:time:prod`        | Applies to `time_prod` — **gated**: requires `TIME_MIGRATE_CONFIRM=yes` in the environment.                           |
| `npm run migrate:time:check`       | Sanity check: probes dbmate availability and shows `time_dev` status (handy in CI).                                   |
| `npm run projection:equivalence:dev` | Replays the `day-scenario` fixture through both the TS reducers and the SQL projection triggers in `time_dev`, and diffs the two. Wipes and reseeds only the fixture's contractor/project slice, so it's safe to re-run and won't touch other streams. |

Production example:

```sh
TIME_MIGRATE_CONFIRM=yes npm run migrate:time:prod
```

The `confirm-prod.mjs` gate exists for one reason: a typo'd command should
never silently mutate production data.

### How dbmate tracks applied migrations

dbmate writes a `schema_migrations(version text pk, applied timestamptz)` table
**inside the target schema** (via `--migrations-table-schema time_dev` or
`time_prod`). That means `time_dev` and `time_prod` keep independent histories
— rebuild one without touching the other.

We pass `--no-dump-schema` so dbmate does **not** create a `db/schema.sql` dump
on every run; the migration files themselves are the source of truth.

### First-run schema bootstrap

dbmate's first action against a target is to create its own `schema_migrations`
table inside `--migrations-table-schema`. If the schema itself doesn't exist
yet, dbmate would fail. To make first-run "just work" the wrapper script
auto-runs `CREATE SCHEMA IF NOT EXISTS <schema>` via `psql` before invoking
dbmate (idempotent — no-op once the schema exists).

This means you need `psql` on `PATH` the first time you ever run
`migrate:time:dev` / `migrate:time:prod` against a fresh database.

- **macOS:** `brew install libpq && brew link --force libpq`
- **Linux:** `apt install postgresql-client`

If you don't want to install `psql`, run this once in the Supabase SQL editor
instead:

```sql
CREATE SCHEMA IF NOT EXISTS time_dev;
CREATE SCHEMA IF NOT EXISTS time_prod;
```

After the schema exists, the wrapper's bootstrap step is a no-op — `psql` is
not needed for subsequent migrations.

### Conventions for migration files

Per [`.cursor/rules/tracker-supabase-migrations.mdc`](.cursor/rules/tracker-supabase-migrations.mdc):

- **Use unqualified names.** No `time_dev.contractor_event` — just `contractor_event`. The same `.sql` file applies to both `time_dev` and `time_prod` because `search_path` selects the schema at runtime.
- **One concern per migration.** A single file should add one logical change (a table, a function, a set of related grants). Easier to review, easier to rebuild.
- **Forward-only is fine.** The `-- migrate:down` section can be left empty or with a `-- no rollback — fix forward` comment for the migration scenarios where reversing isn't worth the maintenance cost. Local dev resets via `dbmate down` are still possible if the down section is filled in.

### Out of scope (for now)

- Porting `supabase/migrations/` and `supabase/client_cockpit_migrations/` to dbmate. Once the `time_*` flow is proven, a follow-up does that.
- Schema drift detection (Atlas does this; can adopt later).
- Auto-applying in CI on merge to main. The current model is **explicit** — a human runs `migrate:time:prod` after reviewing.

---

## Vite / React

This template provides a minimal setup to get React working in Vite with HMR
and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

### Expanding the ESLint configuration

If you are developing a production application, we recommend updating the
configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
