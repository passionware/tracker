-- ============================================================================
-- EVENT STORE FOUNDATION (time_dev / time_prod)
-- ============================================================================
-- Append-only event sourcing primitives for the new time-tracking system.
-- This file uses unqualified object names (per .cursor/rules/tracker-supabase-
-- migrations.mdc) so the same SQL applies to whichever schema is currently on
-- search_path (time_dev or time_prod, set in the connection URL).
--
-- This migration creates:
--   - contractor_event   - per-contractor entry stream
--   - project_event      - per-project task / activity / rate / period_lock stream
--   - contractor_stream_head, project_stream_head, project_aggregate_head
--   - Trigger functions to maintain the head tables
--   - Defense-in-depth triggers that reject UPDATE / DELETE / TRUNCATE
--   - Minimal RLS (service_role writes via the Worker; authenticated SELECTs)
--
-- Refinements (cross-table reads, role-based admin visibility, projection
-- tables, trigger functions for projections) come in subsequent migrations.
-- ============================================================================

-- migrate:up

-- ----------------------------------------------------------------------------
-- 1. contractor_event - one logical stream per contractor.
-- ----------------------------------------------------------------------------
CREATE TABLE contractor_event (
  id              uuid          NOT NULL DEFAULT gen_random_uuid(),
  contractor_id   bigint        NOT NULL,
  seq             bigint        NOT NULL,
  type            text          NOT NULL,
  payload         jsonb         NOT NULL,
  client_event_id uuid          NOT NULL,
  actor_user_id   uuid          NOT NULL,
  received_at     timestamptz   NOT NULL DEFAULT now(),
  prev_event_id   uuid          NULL,
  correlation_id  uuid          NOT NULL,
  causation_id    uuid          NULL,
  event_version   int           NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX contractor_event_seq_uq
  ON contractor_event (contractor_id, seq);
CREATE UNIQUE INDEX contractor_event_idem_uq
  ON contractor_event (contractor_id, client_event_id);
CREATE INDEX contractor_event_correlation_idx
  ON contractor_event (correlation_id);
CREATE INDEX contractor_event_received_at_idx
  ON contractor_event (contractor_id, received_at);

COMMENT ON TABLE contractor_event IS
  'Append-only stream of time-entry events per contractor. Never updated or deleted.';
COMMENT ON COLUMN contractor_event.seq IS
  'Monotonic per contractor; assigned by the Worker after reading contractor_stream_head FOR UPDATE.';
COMMENT ON COLUMN contractor_event.client_event_id IS
  'Idempotency key from the client; (contractor_id, client_event_id) is unique.';
COMMENT ON COLUMN contractor_event.correlation_id IS
  'Originating user-intent or job; one user gesture = one correlation_id, possibly many events.';
COMMENT ON COLUMN contractor_event.causation_id IS
  'Immediate prior event that caused this one; lets us reconstruct chains.';
COMMENT ON COLUMN contractor_event.event_version IS
  'Payload schema version; future-proofs upcasting when payload shapes evolve.';

-- ----------------------------------------------------------------------------
-- 2. project_event - one logical stream per project, multiple aggregate kinds.
-- ----------------------------------------------------------------------------
CREATE TABLE project_event (
  id              uuid          NOT NULL DEFAULT gen_random_uuid(),
  project_id      bigint        NOT NULL,
  seq             bigint        NOT NULL,
  aggregate_kind  text          NOT NULL
    CHECK (aggregate_kind IN ('task', 'activity', 'rate', 'period_lock')),
  aggregate_id    uuid          NOT NULL,
  type            text          NOT NULL,
  payload         jsonb         NOT NULL,
  client_event_id uuid          NOT NULL,
  actor_user_id   uuid          NOT NULL,
  received_at     timestamptz   NOT NULL DEFAULT now(),
  prev_event_id   uuid          NULL,
  correlation_id  uuid          NOT NULL,
  causation_id    uuid          NULL,
  event_version   int           NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX project_event_seq_uq
  ON project_event (project_id, seq);
CREATE UNIQUE INDEX project_event_idem_uq
  ON project_event (project_id, client_event_id);
CREATE INDEX project_event_aggregate_seq_idx
  ON project_event (project_id, aggregate_kind, aggregate_id, seq);
CREATE INDEX project_event_correlation_idx
  ON project_event (correlation_id);
CREATE INDEX project_event_received_at_idx
  ON project_event (project_id, received_at);

COMMENT ON TABLE project_event IS
  'Append-only stream of project-scoped events (tasks, activities, rates, period locks). Never updated or deleted.';
COMMENT ON COLUMN project_event.aggregate_kind IS
  'Discriminates the aggregate within the project stream: task | activity | rate | period_lock.';
COMMENT ON COLUMN project_event.aggregate_id IS
  'Stable id for the aggregate (task_id / activity_id / uuid_v5(project_id, contractor_id) for rate / synthetic for period_lock).';
COMMENT ON COLUMN project_event.seq IS
  'Monotonic per project (across all aggregates); supports replay ordering.';

-- ----------------------------------------------------------------------------
-- 3. Stream head tables - drive O(1) optimistic-concurrency lookups.
-- ----------------------------------------------------------------------------
CREATE TABLE contractor_stream_head (
  contractor_id   bigint        NOT NULL,
  last_seq        bigint        NOT NULL,
  last_event_id   uuid          NOT NULL,
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (contractor_id)
);

COMMENT ON TABLE contractor_stream_head IS
  'Latest seq per contractor for fast optimistic-concurrency checks. Maintained by trigger on contractor_event.';

CREATE TABLE project_stream_head (
  project_id      bigint        NOT NULL,
  last_seq        bigint        NOT NULL,
  last_event_id   uuid          NOT NULL,
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id)
);

COMMENT ON TABLE project_stream_head IS
  'Latest project-wide seq for fast optimistic-concurrency checks. Maintained by trigger on project_event.';

CREATE TABLE project_aggregate_head (
  project_id      bigint        NOT NULL,
  aggregate_kind  text          NOT NULL,
  aggregate_id    uuid          NOT NULL,
  last_seq        bigint        NOT NULL,
  last_event_id   uuid          NOT NULL,
  version         int           NOT NULL DEFAULT 1,
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, aggregate_kind, aggregate_id)
);

COMMENT ON TABLE project_aggregate_head IS
  'Per-aggregate version within each project stream. Drives per-aggregate optimistic concurrency: editing task X does not conflict with editing task Y in the same project.';

-- ----------------------------------------------------------------------------
-- 4. Head-maintenance trigger functions.
-- Both functions are idempotent under monotonic seq inserts (the WHERE guard
-- protects against out-of-order inserts updating the head backwards).
-- ----------------------------------------------------------------------------
-- SECURITY INVOKER + no search_path override: the function must resolve the
-- head table in whichever schema is on the caller's search_path (time_dev or
-- time_prod). Authenticated users cannot reach this code path because they
-- lack INSERT on the event table; only service_role does.
CREATE OR REPLACE FUNCTION update_contractor_stream_head()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  INSERT INTO contractor_stream_head (contractor_id, last_seq, last_event_id)
  VALUES (NEW.contractor_id, NEW.seq, NEW.id)
  ON CONFLICT (contractor_id) DO UPDATE
    SET last_seq      = EXCLUDED.last_seq,
        last_event_id = EXCLUDED.last_event_id,
        updated_at    = now()
    WHERE contractor_stream_head.last_seq < EXCLUDED.last_seq;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION update_contractor_stream_head IS
  'AFTER INSERT trigger that maintains contractor_stream_head with the latest seq.';

CREATE TRIGGER contractor_event_update_head
  AFTER INSERT ON contractor_event
  FOR EACH ROW
  EXECUTE FUNCTION update_contractor_stream_head();

CREATE OR REPLACE FUNCTION update_project_heads()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  INSERT INTO project_stream_head (project_id, last_seq, last_event_id)
  VALUES (NEW.project_id, NEW.seq, NEW.id)
  ON CONFLICT (project_id) DO UPDATE
    SET last_seq      = EXCLUDED.last_seq,
        last_event_id = EXCLUDED.last_event_id,
        updated_at    = now()
    WHERE project_stream_head.last_seq < EXCLUDED.last_seq;

  INSERT INTO project_aggregate_head
    (project_id, aggregate_kind, aggregate_id, last_seq, last_event_id, version)
  VALUES
    (NEW.project_id, NEW.aggregate_kind, NEW.aggregate_id, NEW.seq, NEW.id, 1)
  ON CONFLICT (project_id, aggregate_kind, aggregate_id) DO UPDATE
    SET last_seq      = EXCLUDED.last_seq,
        last_event_id = EXCLUDED.last_event_id,
        version       = project_aggregate_head.version + 1,
        updated_at    = now()
    WHERE project_aggregate_head.last_seq < EXCLUDED.last_seq;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION update_project_heads IS
  'AFTER INSERT trigger that maintains both project_stream_head and project_aggregate_head.';

CREATE TRIGGER project_event_update_heads
  AFTER INSERT ON project_event
  FOR EACH ROW
  EXECUTE FUNCTION update_project_heads();

-- ----------------------------------------------------------------------------
-- 5. Append-only enforcement.
-- Even with REVOKE in place, defense-in-depth: a database-level trigger that
-- raises on UPDATE / DELETE / TRUNCATE so accidental SQL editor edits cannot
-- mutate the audit trail. Service_role cannot bypass triggers.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION reject_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RAISE EXCEPTION
    '% on table % is forbidden - events are append-only',
    TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;

COMMENT ON FUNCTION reject_event_mutation IS
  'Trigger function that hard-rejects UPDATE / DELETE / TRUNCATE on event tables. Append-only invariant.';

CREATE TRIGGER contractor_event_no_update
  BEFORE UPDATE ON contractor_event
  FOR EACH STATEMENT
  EXECUTE FUNCTION reject_event_mutation();

CREATE TRIGGER contractor_event_no_delete
  BEFORE DELETE ON contractor_event
  FOR EACH STATEMENT
  EXECUTE FUNCTION reject_event_mutation();

CREATE TRIGGER contractor_event_no_truncate
  BEFORE TRUNCATE ON contractor_event
  EXECUTE FUNCTION reject_event_mutation();

CREATE TRIGGER project_event_no_update
  BEFORE UPDATE ON project_event
  FOR EACH STATEMENT
  EXECUTE FUNCTION reject_event_mutation();

CREATE TRIGGER project_event_no_delete
  BEFORE DELETE ON project_event
  FOR EACH STATEMENT
  EXECUTE FUNCTION reject_event_mutation();

CREATE TRIGGER project_event_no_truncate
  BEFORE TRUNCATE ON project_event
  EXECUTE FUNCTION reject_event_mutation();

-- ----------------------------------------------------------------------------
-- 6. Permissions and RLS.
-- - PUBLIC / anon / authenticated: stripped of all writes.
-- - service_role retains its default rights (the Worker writes via service_role).
-- - authenticated gets SELECT on event tables, gated by RLS.
--
-- Cross-contractor / admin visibility is intentionally NOT yet permitted here.
-- It is added in a later migration that introduces the time.role table, so
-- this foundation stays minimal and unambiguous.
-- ----------------------------------------------------------------------------
REVOKE ALL ON contractor_event         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON project_event            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON contractor_stream_head   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON project_stream_head      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON project_aggregate_head   FROM PUBLIC, anon, authenticated;

ALTER TABLE contractor_event         ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_event            ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_stream_head   ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stream_head      ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_aggregate_head   ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON contractor_event TO authenticated;
CREATE POLICY contractor_event_select_self
  ON contractor_event
  FOR SELECT
  TO authenticated
  USING (actor_user_id = auth.uid());

-- Project events are project-scoped audit data; until time.role lands we
-- expose them to any authenticated user. Tighten in the role migration.
GRANT SELECT ON project_event TO authenticated;
CREATE POLICY project_event_select_authenticated
  ON project_event
  FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON contractor_stream_head TO authenticated;
CREATE POLICY contractor_stream_head_select_authenticated
  ON contractor_stream_head
  FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON project_stream_head TO authenticated;
CREATE POLICY project_stream_head_select_authenticated
  ON project_stream_head
  FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON project_aggregate_head TO authenticated;
CREATE POLICY project_aggregate_head_select_authenticated
  ON project_aggregate_head
  FOR SELECT
  TO authenticated
  USING (true);

-- migrate:down
-- Forward-only.
-- Reversing the event store would lose audit data. If a true rollback is
-- required (only in dev), drop the schema and re-run all migrations.
-- See README.md "Database migrations" -> "Conventions for migration files".
