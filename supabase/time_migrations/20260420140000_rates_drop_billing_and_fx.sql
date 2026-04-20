-- migrate:up

-- ============================================================================
-- Simplify time-tracking rates: drop cost-vs-billing duality and FX
-- ============================================================================
--
-- Time tracking only needs to record "what does the contractor get paid per
-- unit of work" — i.e. { unit, unitPrice, currency } plus the realised
-- `quantity` and `netValue` on each entry. The downstream reports/billing
-- system (see `src/api/reports/**` and `ReconciliationService`) already owns
-- cost-to-billing conversion, invoice-currency selection and FX. Keeping
-- those concepts on time entries just duplicated the model and forced
-- every event producer (manual start, TMetric backfill, CSV import, …) to
-- invent placeholder values for `billingCurrency` / `exchangeRate` that
-- nobody actually consumed.
--
-- This migration:
--   1. Recreates the `task_actuals` view to use `rate_currency` as the
--      per-task currency column (renamed `billing_currency` -> `currency`).
--   2. Drops `rate_billing_unit_price`, `rate_billing_currency`,
--      `rate_exchange_rate` from both `entry` and `rate_current`.
--   3. Rewrites `apply_project_event` and `apply_contractor_event` so the
--      RateSet / Entry* branches no longer reference the removed columns.
--   4. Leaves the event payloads alone — historical RateSet / EntryStarted
--      / EntryImportedFromTmetric events may still carry the legacy
--      `billingUnitPrice` / `billingCurrency` / `exchangeRate` fields, and
--      the new functions simply ignore them. We do NOT rebuild projections
--      here: the column drop itself leaves the surviving columns coherent
--      with history under the simplified schema.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Recreate `task_actuals` with a single `currency` column derived from
--    `rate_currency`. The old view mixed in `rate_billing_currency` which
--    is about to disappear.
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS task_actuals;

-- ----------------------------------------------------------------------------
-- 2. Drop the cost/billing/FX columns from the projection tables.
-- ----------------------------------------------------------------------------
ALTER TABLE entry
  DROP COLUMN IF EXISTS rate_billing_unit_price,
  DROP COLUMN IF EXISTS rate_billing_currency,
  DROP COLUMN IF EXISTS rate_exchange_rate;

ALTER TABLE rate_current
  DROP COLUMN IF EXISTS rate_billing_unit_price,
  DROP COLUMN IF EXISTS rate_billing_currency,
  DROP COLUMN IF EXISTS rate_exchange_rate;

-- Recreate the view with the simplified shape.
CREATE VIEW task_actuals AS
SELECT
  task_id,
  count(*)                                          AS entry_count_total,
  count(*) FILTER (WHERE deleted_at IS NULL)        AS entry_count_active,
  COALESCE(SUM(duration_seconds)
    FILTER (WHERE deleted_at IS NULL), 0)           AS total_seconds,
  COALESCE(SUM(rate_net_value)
    FILTER (WHERE deleted_at IS NULL), 0)           AS total_net_value,
  -- `currency` is well-defined only when every active entry agrees;
  -- mixed-currency tasks return NULL so the UI can render "—". The
  -- downstream billing system is what reconciles across currencies.
  CASE
    WHEN COUNT(DISTINCT rate_currency)
         FILTER (WHERE deleted_at IS NULL) = 1
    THEN MAX(rate_currency) FILTER (WHERE deleted_at IS NULL)
    ELSE NULL
  END                                               AS currency,
  MIN(started_at)                                   AS first_started_at,
  MAX(stopped_at)                                   AS last_stopped_at
FROM entry
WHERE task_id IS NOT NULL
GROUP BY task_id;

GRANT SELECT ON task_actuals TO authenticated;

COMMENT ON VIEW task_actuals IS
  'Per-task aggregates over the entry projection. `currency` is the single rate currency shared by all active entries (or NULL if mixed).';

-- ----------------------------------------------------------------------------
-- 3. Rewrite `apply_project_event` so RateSet only materialises the three
--    fields we kept. Every other branch is copied verbatim from the prior
--    migration (20260420120000_rate_current_add_aggregate_id.sql) to keep
--    the function self-contained.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_project_event(p_event project_event)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_payload jsonb := p_event.payload;
  v_type    text  := p_event.type;
  v_rate    jsonb;
BEGIN
  CASE v_type
  -- ===== Task aggregate =====
  WHEN 'TaskCreated' THEN
    INSERT INTO task_current (
      id, project_id, client_id, name, description, external_links,
      assignees, estimate_quantity, estimate_unit, last_event_id
    ) VALUES (
      (v_payload ->> 'taskId')::uuid,
      p_event.project_id,
      (v_payload ->> 'clientId')::bigint,
      v_payload ->> 'name',
      v_payload ->> 'description',
      COALESCE(v_payload -> 'externalLinks', '[]'::jsonb),
      COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(v_payload -> 'assignees')::bigint),
        ARRAY[]::bigint[]
      ),
      NULLIF(v_payload #>> '{estimate,quantity}', '')::numeric,
      NULLIF(v_payload #>> '{estimate,unit}', ''),
      p_event.id
    )
    ON CONFLICT (id) DO NOTHING;

  WHEN 'TaskRenamed' THEN
    UPDATE task_current SET
      name          = v_payload ->> 'name',
      version       = version + 1,
      last_event_id = p_event.id,
      updated_at    = now()
    WHERE id = (v_payload ->> 'taskId')::uuid;

  WHEN 'TaskDescriptionChanged' THEN
    UPDATE task_current SET
      description   = v_payload ->> 'description',
      version       = version + 1,
      last_event_id = p_event.id,
      updated_at    = now()
    WHERE id = (v_payload ->> 'taskId')::uuid;

  WHEN 'TaskExternalLinkAdded' THEN
    UPDATE task_current SET
      external_links = COALESCE(external_links, '[]'::jsonb)
                       || jsonb_build_array(v_payload -> 'link'),
      version        = version + 1,
      last_event_id  = p_event.id,
      updated_at     = now()
    WHERE id = (v_payload ->> 'taskId')::uuid;

  WHEN 'TaskExternalLinkRemoved' THEN
    UPDATE task_current SET
      external_links = (
        SELECT COALESCE(jsonb_agg(el), '[]'::jsonb)
          FROM jsonb_array_elements(external_links) AS el
         WHERE NOT (
           el ->> 'provider' = v_payload ->> 'provider'
           AND el ->> 'externalId' = v_payload ->> 'externalId'
         )
      ),
      version       = version + 1,
      last_event_id = p_event.id,
      updated_at    = now()
    WHERE id = (v_payload ->> 'taskId')::uuid;

  WHEN 'TaskAssigned' THEN
    UPDATE task_current SET
      assignees = (
        SELECT ARRAY(
          SELECT DISTINCT x
            FROM unnest(
              assignees || ARRAY[(v_payload ->> 'contractorId')::bigint]
            ) AS x
        )
      ),
      version       = version + 1,
      last_event_id = p_event.id,
      updated_at    = now()
    WHERE id = (v_payload ->> 'taskId')::uuid;

  WHEN 'TaskUnassigned' THEN
    UPDATE task_current SET
      assignees = array_remove(
        assignees,
        (v_payload ->> 'contractorId')::bigint
      ),
      version       = version + 1,
      last_event_id = p_event.id,
      updated_at    = now()
    WHERE id = (v_payload ->> 'taskId')::uuid;

  WHEN 'TaskEstimateSet' THEN
    UPDATE task_current SET
      estimate_quantity = NULLIF(v_payload #>> '{estimate,quantity}', '')::numeric,
      estimate_unit     = NULLIF(v_payload #>> '{estimate,unit}', ''),
      version           = version + 1,
      last_event_id     = p_event.id,
      updated_at        = now()
    WHERE id = (v_payload ->> 'taskId')::uuid;

  WHEN 'TaskCompleted' THEN
    UPDATE task_current SET
      completed_at  = (v_payload ->> 'completedAt')::timestamptz,
      completed_by  = (v_payload ->> 'completedByUserId')::uuid,
      version       = version + 1,
      last_event_id = p_event.id,
      updated_at    = now()
    WHERE id = (v_payload ->> 'taskId')::uuid;

  WHEN 'TaskReopened' THEN
    UPDATE task_current SET
      completed_at  = NULL,
      completed_by  = NULL,
      version       = version + 1,
      last_event_id = p_event.id,
      updated_at    = now()
    WHERE id = (v_payload ->> 'taskId')::uuid;

  WHEN 'TaskArchived' THEN
    UPDATE task_current SET
      is_archived   = true,
      version       = version + 1,
      last_event_id = p_event.id,
      updated_at    = now()
    WHERE id = (v_payload ->> 'taskId')::uuid;

  WHEN 'TaskUnarchived' THEN
    UPDATE task_current SET
      is_archived   = false,
      version       = version + 1,
      last_event_id = p_event.id,
      updated_at    = now()
    WHERE id = (v_payload ->> 'taskId')::uuid;

  -- ===== Activity aggregate =====
  WHEN 'ActivityCreated' THEN
    INSERT INTO activity_current (
      id, project_id, name, description, kinds, last_event_id
    ) VALUES (
      (v_payload ->> 'activityId')::uuid,
      p_event.project_id,
      v_payload ->> 'name',
      v_payload ->> 'description',
      COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(v_payload -> 'kinds')),
        ARRAY[]::text[]
      ),
      p_event.id
    )
    ON CONFLICT (id) DO NOTHING;

  WHEN 'ActivityRenamed' THEN
    UPDATE activity_current SET
      name          = v_payload ->> 'name',
      version       = version + 1,
      last_event_id = p_event.id,
      updated_at    = now()
    WHERE id = (v_payload ->> 'activityId')::uuid;

  WHEN 'ActivityDescriptionChanged' THEN
    UPDATE activity_current SET
      description   = v_payload ->> 'description',
      version       = version + 1,
      last_event_id = p_event.id,
      updated_at    = now()
    WHERE id = (v_payload ->> 'activityId')::uuid;

  WHEN 'ActivityKindsChanged' THEN
    UPDATE activity_current SET
      kinds         = COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(v_payload -> 'kinds')),
        ARRAY[]::text[]
      ),
      version       = version + 1,
      last_event_id = p_event.id,
      updated_at    = now()
    WHERE id = (v_payload ->> 'activityId')::uuid;

  WHEN 'ActivityArchived' THEN
    UPDATE activity_current SET
      is_archived   = true,
      version       = version + 1,
      last_event_id = p_event.id,
      updated_at    = now()
    WHERE id = (v_payload ->> 'activityId')::uuid;

  WHEN 'ActivityUnarchived' THEN
    UPDATE activity_current SET
      is_archived   = false,
      version       = version + 1,
      last_event_id = p_event.id,
      updated_at    = now()
    WHERE id = (v_payload ->> 'activityId')::uuid;

  -- ===== Rate aggregate (simplified: unit + unitPrice + currency only) =====
  WHEN 'RateSet' THEN
    v_rate := v_payload -> 'rate';
    INSERT INTO rate_current (
      project_id, contractor_id, rate_aggregate_id,
      rate_unit, rate_quantity, rate_unit_price, rate_currency,
      effective_from, version, last_event_id
    ) VALUES (
      p_event.project_id,
      (v_payload ->> 'contractorId')::bigint,
      (v_payload ->> 'rateAggregateId')::uuid,
      v_rate ->> 'unit',
      COALESCE((v_rate ->> 'quantity')::numeric, 1),
      (v_rate ->> 'unitPrice')::numeric,
      v_rate ->> 'currency',
      (v_payload ->> 'effectiveFrom')::timestamptz,
      1, p_event.id
    )
    ON CONFLICT (project_id, contractor_id) DO UPDATE SET
      rate_aggregate_id = EXCLUDED.rate_aggregate_id,
      rate_unit         = EXCLUDED.rate_unit,
      rate_quantity     = EXCLUDED.rate_quantity,
      rate_unit_price   = EXCLUDED.rate_unit_price,
      rate_currency     = EXCLUDED.rate_currency,
      effective_from    = EXCLUDED.effective_from,
      version           = rate_current.version + 1,
      last_event_id     = EXCLUDED.last_event_id,
      updated_at        = now();

  WHEN 'RateUnset' THEN
    DELETE FROM rate_current
     WHERE project_id        = p_event.project_id
       AND rate_aggregate_id = (v_payload ->> 'rateAggregateId')::uuid;

  -- ===== Period lock aggregate =====
  WHEN 'PeriodLocked' THEN
    INSERT INTO period_lock (
      id, project_id, contractor_id, period_start, period_end,
      locked_at, locked_by, reason, last_event_id
    ) VALUES (
      (v_payload ->> 'lockId')::uuid,
      p_event.project_id,
      NULLIF(v_payload ->> 'contractorId', '')::bigint,
      (v_payload ->> 'periodStart')::date,
      (v_payload ->> 'periodEnd')::date,
      (v_payload ->> 'lockedAt')::timestamptz,
      (v_payload ->> 'lockedByUserId')::uuid,
      NULLIF(v_payload ->> 'reason', ''),
      p_event.id
    )
    ON CONFLICT (id) DO NOTHING;

  WHEN 'PeriodUnlocked' THEN
    UPDATE period_lock SET
      unlocked_at   = (v_payload ->> 'unlockedAt')::timestamptz,
      unlocked_by   = (v_payload ->> 'unlockedByUserId')::uuid,
      last_event_id = p_event.id
    WHERE id = (v_payload ->> 'lockId')::uuid;

  ELSE
    RAISE NOTICE 'apply_project_event: unknown event type %, skipping (seq=%)', v_type, p_event.seq;
  END CASE;
END;
$$;

COMMENT ON FUNCTION apply_project_event IS
  'SQL mirror of applyProjectEvent() in src/api/time-event/aggregates/project-stream.ts. Rates carry unit + unitPrice + currency only; downstream billing owns FX.';

-- ----------------------------------------------------------------------------
-- 4. Rewrite `apply_contractor_event` so all entry INSERTs/UPDATEs stop
--    touching the dropped columns. Only the rate-writing branches change;
--    every non-rate branch is copied verbatim from the prior migration.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_contractor_event(p_event contractor_event)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_payload jsonb := p_event.payload;
  v_type    text  := p_event.type;
  v_rate    jsonb;
  v_ids     uuid[];
  v_duration int;
  v_quantity numeric;
  v_net_value numeric;
  v_left_id   uuid;
  v_right_id  uuid;
  v_merged_id uuid;
  v_split_at  timestamptz;
  v_right_started_at timestamptz;
  v_src entry%ROWTYPE;
BEGIN
  CASE v_type

  -- ===== Entry lifecycle =====
  WHEN 'EntryStarted' THEN
    v_rate := v_payload -> 'rate';
    INSERT INTO entry (
      id, contractor_id, client_id, workspace_id, project_id,
      task_id, task_version, activity_id, activity_version,
      started_at, stopped_at, description, tags,
      rate_unit, rate_quantity, rate_unit_price, rate_currency,
      rate_net_value,
      is_placeholder, approval_state,
      interrupted_entry_id, resumed_from_entry_id,
      event_count, last_event_id, last_event_seq
    ) VALUES (
      (v_payload ->> 'entryId')::uuid,
      p_event.contractor_id,
      (v_payload ->> 'clientId')::bigint,
      (v_payload ->> 'workspaceId')::bigint,
      (v_payload ->> 'projectId')::bigint,
      NULLIF(v_payload #>> '{task,taskId}', '')::uuid,
      NULLIF(v_payload #>> '{task,taskVersion}', '')::int,
      NULLIF(v_payload #>> '{activity,activityId}', '')::uuid,
      NULLIF(v_payload #>> '{activity,activityVersion}', '')::int,
      (v_payload ->> 'startedAt')::timestamptz,
      NULL,
      NULLIF(v_payload ->> 'description', ''),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_payload -> 'tags')), ARRAY[]::text[]),
      v_rate ->> 'unit',
      COALESCE((v_rate ->> 'quantity')::numeric, 0),
      (v_rate ->> 'unitPrice')::numeric,
      v_rate ->> 'currency',
      COALESCE((v_rate ->> 'netValue')::numeric, 0),
      COALESCE((v_payload ->> 'isPlaceholder')::boolean, false),
      'draft',
      NULLIF(v_payload ->> 'interruptedEntryId', '')::uuid,
      NULLIF(v_payload ->> 'resumedFromEntryId', '')::uuid,
      1, p_event.id, p_event.seq
    )
    ON CONFLICT (id) DO NOTHING;

  WHEN 'EntryStopped' THEN
    UPDATE entry SET
      stopped_at     = (v_payload ->> 'stoppedAt')::timestamptz,
      rate_quantity  = COALESCE(
        rate_quantity_from_duration(
          rate_unit,
          EXTRACT(EPOCH FROM ((v_payload ->> 'stoppedAt')::timestamptz - started_at))::int
        ),
        rate_quantity
      ),
      rate_net_value = CASE
        WHEN rate_quantity_from_duration(
               rate_unit,
               EXTRACT(EPOCH FROM ((v_payload ->> 'stoppedAt')::timestamptz - started_at))::int
             ) IS NOT NULL
        THEN round(
          rate_quantity_from_duration(
            rate_unit,
            EXTRACT(EPOCH FROM ((v_payload ->> 'stoppedAt')::timestamptz - started_at))::int
          ) * rate_unit_price * 100
        ) / 100
        ELSE rate_net_value
      END,
      event_count    = event_count + 1,
      last_event_id  = p_event.id,
      last_event_seq = p_event.seq,
      updated_at     = now()
    WHERE id = (v_payload ->> 'entryId')::uuid
      AND (last_event_seq IS NULL OR last_event_seq < p_event.seq);

  WHEN 'EntryDescriptionChanged' THEN
    UPDATE entry SET
      description    = NULLIF(v_payload ->> 'description', ''),
      event_count    = event_count + 1,
      last_event_id  = p_event.id,
      last_event_seq = p_event.seq,
      updated_at     = now()
    WHERE id = (v_payload ->> 'entryId')::uuid
      AND (last_event_seq IS NULL OR last_event_seq < p_event.seq);

  WHEN 'EntryTaskAssigned' THEN
    UPDATE entry SET
      task_id          = (v_payload #>> '{task,taskId}')::uuid,
      task_version     = (v_payload #>> '{task,taskVersion}')::int,
      activity_id      = (v_payload #>> '{activity,activityId}')::uuid,
      activity_version = (v_payload #>> '{activity,activityVersion}')::int,
      is_placeholder   = false,
      event_count      = event_count + 1,
      last_event_id    = p_event.id,
      last_event_seq   = p_event.seq,
      updated_at       = now()
    WHERE id = (v_payload ->> 'entryId')::uuid
      AND (last_event_seq IS NULL OR last_event_seq < p_event.seq);

  WHEN 'EntryActivityAssigned' THEN
    UPDATE entry SET
      activity_id      = (v_payload #>> '{activity,activityId}')::uuid,
      activity_version = (v_payload #>> '{activity,activityVersion}')::int,
      is_placeholder   = CASE WHEN task_id IS NULL THEN is_placeholder ELSE false END,
      event_count      = event_count + 1,
      last_event_id    = p_event.id,
      last_event_seq   = p_event.seq,
      updated_at       = now()
    WHERE id = (v_payload ->> 'entryId')::uuid
      AND (last_event_seq IS NULL OR last_event_seq < p_event.seq);

  WHEN 'EntryRoutingChanged' THEN
    UPDATE entry SET
      client_id      = (v_payload ->> 'clientId')::bigint,
      workspace_id   = (v_payload ->> 'workspaceId')::bigint,
      project_id     = (v_payload ->> 'projectId')::bigint,
      event_count    = event_count + 1,
      last_event_id  = p_event.id,
      last_event_seq = p_event.seq,
      updated_at     = now()
    WHERE id = (v_payload ->> 'entryId')::uuid
      AND (last_event_seq IS NULL OR last_event_seq < p_event.seq);

  WHEN 'EntryDeleted' THEN
    UPDATE entry SET
      deleted_at     = p_event.received_at,
      event_count    = event_count + 1,
      last_event_id  = p_event.id,
      last_event_seq = p_event.seq,
      updated_at     = now()
    WHERE id = (v_payload ->> 'entryId')::uuid
      AND (last_event_seq IS NULL OR last_event_seq < p_event.seq);

  WHEN 'EntrySplit' THEN
    SELECT * INTO v_src FROM entry WHERE id = (v_payload ->> 'sourceEntryId')::uuid;
    IF v_src.id IS NULL THEN
      RETURN;
    END IF;
    v_left_id        := (v_payload ->> 'leftEntryId')::uuid;
    v_right_id       := (v_payload ->> 'rightEntryId')::uuid;
    v_split_at       := (v_payload ->> 'splitAt')::timestamptz;
    v_right_started_at := v_split_at + make_interval(secs => (COALESCE((v_payload ->> 'gapSeconds')::numeric, 0)));

    UPDATE entry SET
      deleted_at     = p_event.received_at,
      event_count    = event_count + 1,
      last_event_id  = p_event.id,
      last_event_seq = p_event.seq,
      updated_at     = now()
    WHERE id = v_src.id;

    INSERT INTO entry (
      id, contractor_id, client_id, workspace_id, project_id,
      task_id, task_version, activity_id, activity_version,
      started_at, stopped_at, description, tags,
      rate_unit, rate_quantity, rate_unit_price, rate_currency,
      rate_net_value,
      is_placeholder, approval_state,
      interrupted_entry_id, resumed_from_entry_id,
      split_from_entry_id,
      event_count, last_event_id, last_event_seq
    ) VALUES
      (
        v_left_id, v_src.contractor_id, v_src.client_id, v_src.workspace_id, v_src.project_id,
        v_src.task_id, v_src.task_version, v_src.activity_id, v_src.activity_version,
        v_src.started_at, v_split_at, v_src.description, v_src.tags,
        v_src.rate_unit,
        rate_quantity_from_duration(v_src.rate_unit, EXTRACT(EPOCH FROM (v_split_at - v_src.started_at))::int),
        v_src.rate_unit_price, v_src.rate_currency,
        round(
          COALESCE(rate_quantity_from_duration(v_src.rate_unit, EXTRACT(EPOCH FROM (v_split_at - v_src.started_at))::int), 0)
          * v_src.rate_unit_price * 100
        ) / 100,
        v_src.is_placeholder, 'draft',
        v_src.interrupted_entry_id, v_src.resumed_from_entry_id,
        v_src.id, 1, p_event.id, p_event.seq
      ),
      (
        v_right_id, v_src.contractor_id, v_src.client_id, v_src.workspace_id, v_src.project_id,
        v_src.task_id, v_src.task_version, v_src.activity_id, v_src.activity_version,
        v_right_started_at, v_src.stopped_at, v_src.description, v_src.tags,
        v_src.rate_unit,
        rate_quantity_from_duration(v_src.rate_unit, EXTRACT(EPOCH FROM (COALESCE(v_src.stopped_at, v_right_started_at) - v_right_started_at))::int),
        v_src.rate_unit_price, v_src.rate_currency,
        round(
          COALESCE(rate_quantity_from_duration(v_src.rate_unit, EXTRACT(EPOCH FROM (COALESCE(v_src.stopped_at, v_right_started_at) - v_right_started_at))::int), 0)
          * v_src.rate_unit_price * 100
        ) / 100,
        v_src.is_placeholder, 'draft',
        v_src.interrupted_entry_id, v_src.resumed_from_entry_id,
        v_src.id, 1, p_event.id, p_event.seq
      )
    ON CONFLICT (id) DO NOTHING;

  WHEN 'EntryMerged' THEN
    v_left_id   := (v_payload ->> 'leftEntryId')::uuid;
    v_right_id  := (v_payload ->> 'rightEntryId')::uuid;
    v_merged_id := (v_payload ->> 'mergedEntryId')::uuid;

    SELECT * INTO v_src FROM entry WHERE id = v_left_id;
    IF v_src.id IS NULL THEN
      RETURN;
    END IF;

    INSERT INTO entry (
      id, contractor_id, client_id, workspace_id, project_id,
      task_id, task_version, activity_id, activity_version,
      started_at, stopped_at, description, tags,
      rate_unit, rate_quantity, rate_unit_price, rate_currency,
      rate_net_value,
      is_placeholder, approval_state,
      interrupted_entry_id, resumed_from_entry_id,
      split_from_entry_id,
      event_count, last_event_id, last_event_seq
    )
    SELECT
      v_merged_id,
      v_src.contractor_id, v_src.client_id, v_src.workspace_id, v_src.project_id,
      v_src.task_id, v_src.task_version, v_src.activity_id, v_src.activity_version,
      LEAST(a.started_at, b.started_at),
      CASE
        WHEN a.stopped_at IS NULL OR b.stopped_at IS NULL THEN NULL
        ELSE GREATEST(a.stopped_at, b.stopped_at)
      END,
      v_src.description, v_src.tags,
      v_src.rate_unit,
      rate_quantity_from_duration(
        v_src.rate_unit,
        EXTRACT(EPOCH FROM (
          CASE
            WHEN a.stopped_at IS NULL OR b.stopped_at IS NULL THEN LEAST(a.started_at, b.started_at)
            ELSE GREATEST(a.stopped_at, b.stopped_at)
          END - LEAST(a.started_at, b.started_at)
        ))::int
      ),
      v_src.rate_unit_price, v_src.rate_currency,
      round(
        COALESCE(rate_quantity_from_duration(
          v_src.rate_unit,
          EXTRACT(EPOCH FROM (
            CASE
              WHEN a.stopped_at IS NULL OR b.stopped_at IS NULL THEN LEAST(a.started_at, b.started_at)
              ELSE GREATEST(a.stopped_at, b.stopped_at)
            END - LEAST(a.started_at, b.started_at)
          ))::int
        ), 0) * v_src.rate_unit_price * 100
      ) / 100,
      v_src.is_placeholder, 'draft',
      v_src.interrupted_entry_id, v_src.resumed_from_entry_id,
      v_src.id,
      1, p_event.id, p_event.seq
    FROM entry a, entry b
    WHERE a.id = v_left_id AND b.id = v_right_id
    ON CONFLICT (id) DO NOTHING;

    UPDATE entry SET
      deleted_at     = p_event.received_at,
      event_count    = event_count + 1,
      last_event_id  = p_event.id,
      last_event_seq = p_event.seq,
      updated_at     = now()
    WHERE id IN (v_left_id, v_right_id)
      AND (last_event_seq IS NULL OR last_event_seq < p_event.seq);

  WHEN 'EntryRateSnapshotted' THEN
    v_rate := v_payload -> 'rate';
    UPDATE entry SET
      rate_unit       = v_rate ->> 'unit',
      rate_quantity   = COALESCE((v_rate ->> 'quantity')::numeric, rate_quantity),
      rate_unit_price = (v_rate ->> 'unitPrice')::numeric,
      rate_currency   = v_rate ->> 'currency',
      rate_net_value  = COALESCE((v_rate ->> 'netValue')::numeric, rate_net_value),
      event_count     = event_count + 1,
      last_event_id   = p_event.id,
      last_event_seq  = p_event.seq,
      updated_at      = now()
    WHERE id = (v_payload ->> 'entryId')::uuid
      AND (last_event_seq IS NULL OR last_event_seq < p_event.seq);

  WHEN 'EntryTagsChanged' THEN
    UPDATE entry SET
      tags           = COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_payload -> 'tags')), ARRAY[]::text[]),
      event_count    = event_count + 1,
      last_event_id  = p_event.id,
      last_event_seq = p_event.seq,
      updated_at     = now()
    WHERE id = (v_payload ->> 'entryId')::uuid
      AND (last_event_seq IS NULL OR last_event_seq < p_event.seq);

  -- ===== Approval flow =====
  WHEN 'TimeSubmittedForApproval' THEN
    v_ids := ARRAY(SELECT (jsonb_array_elements_text(v_payload -> 'entryIds'))::uuid);
    UPDATE entry SET
      approval_state = 'submitted',
      event_count    = event_count + 1,
      last_event_id  = p_event.id,
      last_event_seq = p_event.seq,
      updated_at     = now()
    WHERE id = ANY(v_ids)
      AND (last_event_seq IS NULL OR last_event_seq < p_event.seq);

  WHEN 'TimeApproved' THEN
    v_ids := ARRAY(SELECT (jsonb_array_elements_text(v_payload -> 'entryIds'))::uuid);
    UPDATE entry SET
      approval_state      = 'approved',
      approval_decided_at = (v_payload ->> 'approvedAt')::timestamptz,
      approval_decided_by = (v_payload ->> 'approverUserId')::uuid,
      approval_reason     = NULLIF(v_payload ->> 'note', ''),
      event_count         = event_count + 1,
      last_event_id       = p_event.id,
      last_event_seq      = p_event.seq,
      updated_at          = now()
    WHERE id = ANY(v_ids)
      AND (last_event_seq IS NULL OR last_event_seq < p_event.seq);

  WHEN 'TimeRejected' THEN
    v_ids := ARRAY(SELECT (jsonb_array_elements_text(v_payload -> 'entryIds'))::uuid);
    UPDATE entry SET
      approval_state      = 'rejected',
      approval_decided_at = (v_payload ->> 'rejectedAt')::timestamptz,
      approval_decided_by = (v_payload ->> 'rejectedByUserId')::uuid,
      approval_reason     = v_payload ->> 'reason',
      event_count         = event_count + 1,
      last_event_id       = p_event.id,
      last_event_seq      = p_event.seq,
      updated_at          = now()
    WHERE id = ANY(v_ids)
      AND (last_event_seq IS NULL OR last_event_seq < p_event.seq);

  WHEN 'EntryRevertedToDraft' THEN
    UPDATE entry SET
      approval_state      = 'draft',
      approval_decided_at = NULL,
      approval_decided_by = NULL,
      approval_reason     = NULL,
      event_count         = event_count + 1,
      last_event_id       = p_event.id,
      last_event_seq      = p_event.seq,
      updated_at          = now()
    WHERE id = (v_payload ->> 'entryId')::uuid
      AND (last_event_seq IS NULL OR last_event_seq < p_event.seq);

  -- ===== Imports =====
  WHEN 'EntryImportedFromTmetric' THEN
    v_rate := v_payload -> 'rate';
    v_duration := EXTRACT(EPOCH FROM (
      (v_payload ->> 'stoppedAt')::timestamptz - (v_payload ->> 'startedAt')::timestamptz
    ))::int;
    v_quantity := COALESCE(
      (v_rate ->> 'quantity')::numeric,
      rate_quantity_from_duration(v_rate ->> 'unit', v_duration),
      0
    );
    v_net_value := COALESCE(
      (v_rate ->> 'netValue')::numeric,
      round(v_quantity * (v_rate ->> 'unitPrice')::numeric * 100) / 100
    );
    INSERT INTO entry (
      id, contractor_id, client_id, workspace_id, project_id,
      task_id, task_version, activity_id, activity_version,
      started_at, stopped_at, description, tags,
      rate_unit, rate_quantity, rate_unit_price, rate_currency,
      rate_net_value,
      is_placeholder, approval_state,
      interrupted_entry_id, resumed_from_entry_id,
      event_count, last_event_id, last_event_seq
    ) VALUES (
      (v_payload ->> 'entryId')::uuid,
      p_event.contractor_id,
      (v_payload ->> 'clientId')::bigint,
      (v_payload ->> 'workspaceId')::bigint,
      (v_payload ->> 'projectId')::bigint,
      NULLIF(v_payload #>> '{task,taskId}', '')::uuid,
      NULLIF(v_payload #>> '{task,taskVersion}', '')::int,
      NULLIF(v_payload #>> '{activity,activityId}', '')::uuid,
      NULLIF(v_payload #>> '{activity,activityVersion}', '')::int,
      (v_payload ->> 'startedAt')::timestamptz,
      (v_payload ->> 'stoppedAt')::timestamptz,
      NULLIF(v_payload ->> 'description', ''),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_payload -> 'tags')), ARRAY[]::text[]),
      v_rate ->> 'unit',
      v_quantity,
      (v_rate ->> 'unitPrice')::numeric,
      v_rate ->> 'currency',
      v_net_value,
      COALESCE((v_payload ->> 'isPlaceholder')::boolean, false),
      'draft',
      NULL, NULL,
      1, p_event.id, p_event.seq
    )
    ON CONFLICT (id) DO NOTHING;

  ELSE
    RAISE NOTICE 'apply_contractor_event: unknown event type %, skipping (seq=%)', v_type, p_event.seq;
  END CASE;
END;
$$;

COMMENT ON FUNCTION apply_contractor_event IS
  'SQL mirror of applyContractorEvent() in src/api/time-event/aggregates/contractor-stream.ts. Rate snapshots carry unit + unitPrice + currency only.';

-- migrate:down

-- Non-reversible: the dropped columns are gone and the prior function
-- bodies relied on them. To revert, restore the previous migration's
-- definitions by hand.
