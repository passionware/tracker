-- ============================================================================
-- GRANT service_role access on event tables, projection tables and append RPCs
-- ============================================================================
-- The Worker writes to `contractor_event` / `project_event` and calls the
-- `append_*_event` / `rebuild_projections` RPCs as `service_role` (the
-- Supabase "service_role" JWT sets that as the connection role).
--
-- The earlier event-store migration did `REVOKE ALL ON <event> FROM PUBLIC,
-- anon, authenticated` and then granted only SELECT back to `authenticated`.
-- It relied on the claim that "service_role retains its default rights" —
-- but in a custom schema (`time_dev` / `time_prod`) there _are_ no default
-- rights for service_role because Supabase's built-in `ALTER DEFAULT
-- PRIVILEGES` only applies to `public`. Result: the worker hit
-- "permission denied for table project_event" the moment we swapped
-- InMemoryTimeEventStore for SupabaseTimeEventStore.
--
-- This migration fixes it by explicitly granting service_role:
--   * INSERT / SELECT on both event tables (it never UPDATEs/DELETEs because
--     of the append-only trigger)
--   * SELECT / INSERT / UPDATE / DELETE on every projection table, so the
--     apply_* trigger functions can mutate them when they run inside the
--     service_role connection
--   * EXECUTE on every function the worker calls
--
-- RLS is unaffected — service_role bypasses RLS by design.
-- ============================================================================

-- migrate:up

-- Event tables (append-only; INSERT is sufficient, triggers enforce
-- monotonicity and reject UPDATE/DELETE).
GRANT SELECT, INSERT ON contractor_event TO service_role;
GRANT SELECT, INSERT ON project_event    TO service_role;

-- Stream / aggregate heads are maintained by trigger when events land.
GRANT SELECT, INSERT, UPDATE ON contractor_stream_head  TO service_role;
GRANT SELECT, INSERT, UPDATE ON project_stream_head     TO service_role;
GRANT SELECT, INSERT, UPDATE ON project_aggregate_head  TO service_role;

-- Projection tables: mutated by the apply_* triggers running inside the
-- service_role connection. Rebuild needs DELETE/TRUNCATE too.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'entry', 'task_current', 'activity_current', 'rate_current',
    'role', 'period_lock', 'outbox_event'
  ]
  LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON %I TO service_role',
      t
    );
  END LOOP;
END
$$;

-- RPCs the worker calls. EXECUTE defaults to PUBLIC for new functions but
-- the earlier migration REVOKEd PUBLIC; re-grant explicitly for service_role.
GRANT EXECUTE ON FUNCTION append_contractor_event(bigint, text, jsonb, uuid, uuid, uuid, uuid, int, int)         TO service_role;
GRANT EXECUTE ON FUNCTION append_project_event(bigint, text, uuid, text, jsonb, uuid, uuid, uuid, uuid, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION rebuild_projections()                                                                   TO service_role;

-- migrate:down

-- Forward-only — see the top-of-file comment in
-- 20260419120000_add_event_store.sql.
