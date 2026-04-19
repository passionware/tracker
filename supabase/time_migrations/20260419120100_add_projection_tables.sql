-- ============================================================================
-- READ-MODEL PROJECTION TABLES (time_dev / time_prod)
-- ============================================================================
-- Derived state, rebuildable from contractor_event + project_event by replaying
-- their `apply_*` trigger functions (added in a follow-up migration). All
-- mutations to these tables come from those triggers; nothing in the app or
-- the Worker should INSERT/UPDATE/DELETE them directly.
--
-- This migration creates:
--   - entry              - one row per time entry (the main read model)
--   - task_current       - latest state of every task per project
--   - activity_current   - latest state of every activity per project
--   - rate_current       - latest rate per (project, contractor)
--   - role               - user role grants (contractor_self / project_admin / super_admin)
--   - period_lock        - locked time ranges that block edits/inserts
--   - outbox_event       - external-system delivery queue (Linear/GitLab/...)
--   - task_actuals (VIEW) - per-task aggregates derived from `entry`
--
-- All projection tables have RLS enabled. Until the dedicated role migration
-- lands the SELECT policies are intentionally permissive (`USING (true)`)
-- because event tables are already filtered to "your own actor_user_id" and
-- the projections currently do not expose any new sensitive surface. Writes
-- are revoked from anon/authenticated; service_role writes via the apply
-- triggers fired off the event tables.
-- ============================================================================

-- migrate:up

-- ----------------------------------------------------------------------------
-- 1. entry - the main read model. One row per time entry.
-- ----------------------------------------------------------------------------
CREATE TABLE entry (
  id                       uuid          NOT NULL,
  -- mandatory dimensions (every entry MUST define these)
  contractor_id            bigint        NOT NULL,
  client_id                bigint        NOT NULL,
  workspace_id             bigint        NOT NULL,
  project_id               bigint        NOT NULL,
  -- task / activity (nullable while the entry is a placeholder)
  task_id                  uuid          NULL,
  task_version             int           NULL,
  activity_id              uuid          NULL,
  activity_version         int           NULL,
  -- timing
  started_at               timestamptz   NOT NULL,
  stopped_at               timestamptz   NULL,
  duration_seconds         int           GENERATED ALWAYS AS (
    CASE
      WHEN stopped_at IS NULL THEN NULL
      ELSE EXTRACT(EPOCH FROM (stopped_at - started_at))::int
    END
  ) STORED,
  -- description and tags
  description              text          NULL,
  tags                     text[]        NOT NULL DEFAULT '{}',
  -- rate snapshot - mirrors src/api/reports/reports.api.ts ReportPayload
  -- so analytics & billing can use the entry directly without joining.
  rate_unit                text          NOT NULL,
  rate_quantity            numeric(20,6) NOT NULL,
  rate_unit_price          numeric(20,6) NOT NULL,
  rate_currency            text          NOT NULL,
  rate_billing_unit_price  numeric(20,6) NOT NULL,
  rate_billing_currency    text          NOT NULL,
  rate_exchange_rate       numeric(20,8) NOT NULL,
  rate_net_value           numeric(20,6) NOT NULL,
  -- placeholder ("I started for client X, will fill task/activity later")
  is_placeholder           boolean       NOT NULL DEFAULT false,
  -- approval workflow
  approval_state           text          NOT NULL DEFAULT 'draft'
    CHECK (approval_state IN ('draft', 'submitted', 'approved', 'rejected')),
  approval_decided_at      timestamptz   NULL,
  approval_decided_by      uuid          NULL,
  approval_reason          text          NULL,
  -- provenance / lineage (for split, jump-on, resume)
  split_from_entry_id      uuid          NULL,
  interrupted_entry_id     uuid          NULL,
  resumed_from_entry_id    uuid          NULL,
  -- soft delete (we never physically remove an entry; deleted_at hides it)
  deleted_at               timestamptz   NULL,
  -- bookkeeping
  event_count              int           NOT NULL DEFAULT 0,
  last_event_id            uuid          NULL,
  last_event_seq           bigint        NULL,
  created_at               timestamptz   NOT NULL DEFAULT now(),
  updated_at               timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  -- Non-placeholder entries must define both task and activity; placeholders
  -- may have either or both null, but never mix "placeholder=false with one
  -- of them missing".
  CONSTRAINT entry_placeholder_consistency CHECK (
    is_placeholder = true
    OR (task_id IS NOT NULL AND activity_id IS NOT NULL)
  )
);

-- Hot-path indexes
CREATE INDEX entry_contractor_started_at_idx
  ON entry (contractor_id, started_at DESC);
CREATE INDEX entry_project_started_at_idx
  ON entry (project_id, started_at DESC);
CREATE INDEX entry_client_started_at_idx
  ON entry (client_id, started_at DESC);
CREATE INDEX entry_workspace_started_at_idx
  ON entry (workspace_id, started_at DESC);
CREATE INDEX entry_task_idx
  ON entry (task_id) WHERE task_id IS NOT NULL;
CREATE INDEX entry_activity_idx
  ON entry (activity_id) WHERE activity_id IS NOT NULL;
-- "Active timer right now" lookups
CREATE INDEX entry_active_idx
  ON entry (contractor_id, started_at DESC) WHERE stopped_at IS NULL AND deleted_at IS NULL;
-- Approval queue: most rows are 'draft', the queue only cares about 'submitted'.
CREATE INDEX entry_pending_approval_idx
  ON entry (project_id, approval_decided_at NULLS FIRST)
  WHERE approval_state = 'submitted' AND deleted_at IS NULL;
-- "Needs detail" placeholder badge
CREATE INDEX entry_placeholder_idx
  ON entry (contractor_id, started_at DESC)
  WHERE is_placeholder = true AND deleted_at IS NULL;
-- Tag filtering / suggestions (GIN supports @>, &&, ?|, ?&)
CREATE INDEX entry_tags_gin
  ON entry USING gin (tags);
-- Lineage lookups (resume-from-X chip, split history)
CREATE INDEX entry_interrupted_idx
  ON entry (interrupted_entry_id) WHERE interrupted_entry_id IS NOT NULL;
CREATE INDEX entry_split_from_idx
  ON entry (split_from_entry_id) WHERE split_from_entry_id IS NOT NULL;

COMMENT ON TABLE entry IS
  'Time-entry read model. Every column is derived from contractor_event by apply_contractor_event(). Never write directly.';
COMMENT ON COLUMN entry.is_placeholder IS
  'true when the entry was started without task/activity (must be resolved before approval/export).';
COMMENT ON COLUMN entry.interrupted_entry_id IS
  'When this entry is a jump-on session, points back at the entry that was paused so the UI can offer a one-click resume.';
COMMENT ON COLUMN entry.resumed_from_entry_id IS
  'When this entry was created by resuming after a jump-on, points at the jump-on entry; lets us reconstruct the chain.';

-- ----------------------------------------------------------------------------
-- 2. task_current - latest state of every task in a project.
-- ----------------------------------------------------------------------------
CREATE TABLE task_current (
  id                  uuid          NOT NULL,
  project_id          bigint        NOT NULL,
  client_id           bigint        NOT NULL,
  name                text          NOT NULL,
  description         text          NULL,
  external_links      jsonb         NOT NULL DEFAULT '[]'::jsonb,
  -- Multi-assignee task; empty array = unassigned.
  assignees           uuid[]        NOT NULL DEFAULT '{}',
  estimate_quantity   numeric(20,6) NULL,
  estimate_unit       text          NULL,
  completed_at        timestamptz   NULL,
  completed_by        uuid          NULL,
  is_archived         boolean       NOT NULL DEFAULT false,
  version             int           NOT NULL DEFAULT 0,
  last_event_id       uuid          NULL,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT task_estimate_pair_consistency CHECK (
    (estimate_quantity IS NULL AND estimate_unit IS NULL)
    OR (estimate_quantity IS NOT NULL AND estimate_unit IS NOT NULL)
  )
);

CREATE INDEX task_current_project_open_idx
  ON task_current (project_id, completed_at NULLS FIRST, name)
  WHERE is_archived = false;
CREATE INDEX task_current_client_idx
  ON task_current (client_id);
CREATE INDEX task_current_assignees_gin
  ON task_current USING gin (assignees);
-- Task-suggestion path: open tasks assigned to me.
CREATE INDEX task_current_open_assignees_gin
  ON task_current USING gin (assignees)
  WHERE completed_at IS NULL AND is_archived = false;

COMMENT ON TABLE task_current IS
  'Current state of every project task. Derived from project_event(aggregate_kind=task).';
COMMENT ON COLUMN task_current.external_links IS
  'JSON array of {provider:"linear"|"gitlab"|"bitbucket"|"git_branch"|"url", id|url:..., label?:...}';
COMMENT ON COLUMN task_current.assignees IS
  'auth.uid() values of contractors who can see this task in their suggestions.';

-- ----------------------------------------------------------------------------
-- 3. activity_current - latest state of every activity in a project.
-- ----------------------------------------------------------------------------
CREATE TABLE activity_current (
  id                  uuid          NOT NULL,
  project_id          bigint        NOT NULL,
  name                text          NOT NULL,
  description         text          NULL,
  -- Free-form classification: 'development', 'meeting', 'code_review',
  -- 'jump_on' (mentoring/pairing), etc. Used for filters and special UX
  -- (e.g. teammate-avatar quick-start row picks activities tagged 'jump_on').
  kinds               text[]        NOT NULL DEFAULT '{}',
  is_archived         boolean       NOT NULL DEFAULT false,
  version             int           NOT NULL DEFAULT 0,
  last_event_id       uuid          NULL,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE INDEX activity_current_project_idx
  ON activity_current (project_id, name) WHERE is_archived = false;
CREATE INDEX activity_current_kinds_gin
  ON activity_current USING gin (kinds);

COMMENT ON TABLE activity_current IS
  'Current state of every project activity. Derived from project_event(aggregate_kind=activity).';
COMMENT ON COLUMN activity_current.kinds IS
  'Multi-tag classification (development|meeting|code_review|jump_on|...). Drives suggestion lists and special UX.';

-- ----------------------------------------------------------------------------
-- 4. rate_current - latest rate snapshot per (project, contractor).
-- ----------------------------------------------------------------------------
CREATE TABLE rate_current (
  project_id               bigint        NOT NULL,
  contractor_id            bigint        NOT NULL,
  rate_unit                text          NOT NULL,
  rate_quantity            numeric(20,6) NOT NULL DEFAULT 1,
  rate_unit_price          numeric(20,6) NOT NULL,
  rate_currency            text          NOT NULL,
  rate_billing_unit_price  numeric(20,6) NOT NULL,
  rate_billing_currency    text          NOT NULL,
  rate_exchange_rate       numeric(20,8) NOT NULL DEFAULT 1,
  effective_from           timestamptz   NOT NULL,
  version                  int           NOT NULL DEFAULT 0,
  last_event_id            uuid          NULL,
  updated_at               timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, contractor_id)
);

CREATE INDEX rate_current_contractor_idx
  ON rate_current (contractor_id);

COMMENT ON TABLE rate_current IS
  'Currently-effective rate per (project, contractor). Snapshotted onto each entry at start time. Derived from project_event(aggregate_kind=rate).';

-- ----------------------------------------------------------------------------
-- 5. role - user role grants.
-- ----------------------------------------------------------------------------
CREATE TABLE role (
  user_id              uuid          NOT NULL,
  role                 text          NOT NULL
    CHECK (role IN ('contractor_self', 'project_admin', 'super_admin')),
  -- NULL when the role is global (super_admin) or implicitly self-scoped
  -- (contractor_self). Required for project_admin (which project they admin).
  scope_project_id     bigint        NULL,
  granted_at           timestamptz   NOT NULL DEFAULT now(),
  granted_by           uuid          NULL,
  last_event_id        uuid          NULL,
  -- A user can hold the same role with the same scope only once. NULLS NOT
  -- DISTINCT (Postgres 15+) lets us treat (..., NULL) as a single key.
  CONSTRAINT role_uq UNIQUE NULLS NOT DISTINCT (user_id, role, scope_project_id),
  -- project_admin requires a scope; the global roles must NOT have one.
  CONSTRAINT role_scope_consistency CHECK (
    (role = 'project_admin' AND scope_project_id IS NOT NULL)
    OR (role IN ('contractor_self', 'super_admin') AND scope_project_id IS NULL)
  )
);

CREATE INDEX role_user_idx ON role (user_id);
CREATE INDEX role_project_admin_idx
  ON role (scope_project_id, user_id) WHERE role = 'project_admin';

COMMENT ON TABLE role IS
  'Authorization grants. Read by RLS policies. Derived from a future user_role event stream (the bootstrap inserts run from the admin UI).';

-- ----------------------------------------------------------------------------
-- 6. period_lock - locked periods that prevent further mutation.
-- ----------------------------------------------------------------------------
CREATE TABLE period_lock (
  id                  uuid          NOT NULL DEFAULT gen_random_uuid(),
  project_id          bigint        NOT NULL,
  -- NULL = lock all contractors in the project for that period; non-null =
  -- lock only that contractor (per-contractor close).
  contractor_id       bigint        NULL,
  period_start        date          NOT NULL,
  period_end          date          NOT NULL,
  locked_at           timestamptz   NOT NULL,
  locked_by           uuid          NOT NULL,
  unlocked_at         timestamptz   NULL,
  unlocked_by         uuid          NULL,
  reason              text          NULL,
  last_event_id       uuid          NULL,
  PRIMARY KEY (id),
  CONSTRAINT period_lock_range_valid CHECK (period_end >= period_start)
);

-- "Is this entry inside an active lock?" - the RLS / Worker check.
CREATE INDEX period_lock_active_project_idx
  ON period_lock (project_id, period_start, period_end)
  WHERE unlocked_at IS NULL;
CREATE INDEX period_lock_active_contractor_idx
  ON period_lock (project_id, contractor_id, period_start, period_end)
  WHERE unlocked_at IS NULL AND contractor_id IS NOT NULL;

COMMENT ON TABLE period_lock IS
  'Active locks block mutation of entries inside [period_start, period_end]. Derived from project_event(aggregate_kind=period_lock).';

-- ----------------------------------------------------------------------------
-- 7. outbox_event - reliable delivery queue for external integrations.
-- ----------------------------------------------------------------------------
CREATE TABLE outbox_event (
  id                  uuid          NOT NULL DEFAULT gen_random_uuid(),
  -- The internal event that produced this outbox row (audit trail).
  source_event_id     uuid          NOT NULL,
  source_event_table  text          NOT NULL
    CHECK (source_event_table IN ('contractor_event', 'project_event')),
  target              text          NOT NULL, -- 'linear' | 'gitlab' | 'bitbucket' | ...
  event_type          text          NOT NULL,
  payload             jsonb         NOT NULL,
  status              text          NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_flight', 'delivered', 'failed', 'dead')),
  attempts            int           NOT NULL DEFAULT 0,
  last_attempt_at     timestamptz   NULL,
  last_error          text          NULL,
  next_attempt_at     timestamptz   NOT NULL DEFAULT now(),
  delivered_at        timestamptz   NULL,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Worker pickup index: ready-to-send rows ordered by next_attempt_at.
CREATE INDEX outbox_event_pickup_idx
  ON outbox_event (next_attempt_at)
  WHERE status IN ('pending', 'failed');
CREATE INDEX outbox_event_target_status_idx
  ON outbox_event (target, status);

COMMENT ON TABLE outbox_event IS
  'Reliable-delivery queue for external systems. Worker SELECTs FOR UPDATE SKIP LOCKED, sends, marks delivered/failed.';

-- ----------------------------------------------------------------------------
-- 8. task_actuals (VIEW) - per-task aggregates over `entry`.
-- ----------------------------------------------------------------------------
-- Derived view, not materialized: cheap because (task_id) is indexed and
-- entries-per-task is bounded. If this becomes hot we can swap to a
-- materialized projection (task_actuals_current) maintained by triggers.
CREATE VIEW task_actuals AS
SELECT
  task_id,
  count(*)                                          AS entry_count_total,
  count(*) FILTER (WHERE deleted_at IS NULL)        AS entry_count_active,
  COALESCE(SUM(duration_seconds)
    FILTER (WHERE deleted_at IS NULL), 0)           AS total_seconds,
  COALESCE(SUM(rate_net_value)
    FILTER (WHERE deleted_at IS NULL), 0)           AS total_net_value,
  -- billing_currency is well-defined only when every active entry agrees;
  -- mixed-currency tasks return NULL so the UI can render "—".
  CASE
    WHEN COUNT(DISTINCT rate_billing_currency)
         FILTER (WHERE deleted_at IS NULL) = 1
    THEN MAX(rate_billing_currency) FILTER (WHERE deleted_at IS NULL)
    ELSE NULL
  END                                               AS billing_currency,
  MIN(started_at)                                   AS first_started_at,
  MAX(stopped_at)                                   AS last_stopped_at
FROM entry
WHERE task_id IS NOT NULL
GROUP BY task_id;

COMMENT ON VIEW task_actuals IS
  'Per-task aggregates over the entry projection. Used by the % over estimate UI on TimeTrackingTasksPage.';

-- ----------------------------------------------------------------------------
-- 9. Permissions / RLS.
--   Until the dedicated role migration lands, all projection tables expose
--   SELECT to authenticated under permissive policies and revoke writes.
--   Trigger-driven inserts run as the connection role (service_role from the
--   Worker), not as the authenticated user, so REVOKEing writes from
--   authenticated does not stop projection updates.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'entry', 'task_current', 'activity_current', 'rate_current',
    'role', 'period_lock', 'outbox_event'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON %I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT ON %I TO authenticated', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (true)',
      t || '_select_authenticated',
      t
    );
  END LOOP;
END
$$;

-- Views inherit RLS from their base tables, so the entry policy above applies
-- to task_actuals already. We still need to GRANT SELECT explicitly because
-- VIEWs don't pick up table grants automatically.
GRANT SELECT ON task_actuals TO authenticated;

-- migrate:down
-- Forward-only.
-- Reversing projection tables in production would lose derived state for the
-- duration of the rebuild and is not worth the maintenance cost. In dev,
-- drop the schema and re-run all migrations.
