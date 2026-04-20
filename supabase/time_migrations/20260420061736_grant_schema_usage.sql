-- ============================================================================
-- GRANT SCHEMA USAGE to Supabase roles (time_dev / time_prod)
-- ============================================================================
-- PostgREST routes API requests through the `authenticator` role, which does
-- `SET ROLE anon | authenticated | service_role` per-request. Those roles
-- cannot touch any object inside a custom schema (like time_dev) unless they
-- have USAGE on the schema itself — even if they already hold SELECT on the
-- underlying tables. Without this grant the frontend sees:
--
--   error: permission denied for schema time_dev
--
-- The initial event-store migration granted SELECT on each event / head
-- table individually but forgot the schema-level USAGE. dbmate's bootstrap
-- step (`CREATE SCHEMA IF NOT EXISTS ...`) only creates the schema; it does
-- not grant USAGE to the Supabase roles. This migration fixes that.
--
-- The grants are idempotent (GRANT USAGE is a no-op if already present) so
-- running this against a schema that somehow already had it is safe.
--
-- We also grant USAGE to `postgres` explicitly. `postgres` is typically the
-- role dbmate runs as — it already has implicit access as the schema owner,
-- but being explicit here protects future environments where that isn't
-- true (self-hosted Supabase, external tooling, etc.).
--
-- Uses `current_schema()` rather than hardcoding the schema name, because
-- these migrations run once against `time_dev` and once against `time_prod`
-- (the `SET search_path` injected by `scripts/dbmate-time.mjs` picks the
-- right one).
-- ============================================================================

-- migrate:up

DO $$
DECLARE
  target_schema text := current_schema();
BEGIN
  EXECUTE format(
    'GRANT USAGE ON SCHEMA %I TO anon, authenticated, service_role, postgres',
    target_schema
  );
END
$$;

-- migrate:down

DO $$
DECLARE
  target_schema text := current_schema();
BEGIN
  EXECUTE format(
    'REVOKE USAGE ON SCHEMA %I FROM anon, authenticated, service_role',
    target_schema
  );
END
$$;
