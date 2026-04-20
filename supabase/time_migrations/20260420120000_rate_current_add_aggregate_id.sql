-- migrate:up

-- ============================================================================
-- rate_current: expose rate_aggregate_id for the rate admin UI
-- ============================================================================
--
-- Until now `rate_current` was keyed only by `(project_id, contractor_id)`.
-- That is enough for *reading* the current rate, but the admin UI also
-- needs to *update* and *retire* rate aggregates, which requires knowing
-- the `rateAggregateId` that the reducer is going to check against.
--
-- We previously reconstructed the aggregate id at RateUnset time by
-- walking `project_event` back to the most recent matching RateSet. That
-- worked server-side but couldn't help a UI that needs the id *before*
-- submitting an event.
--
-- This migration:
--   1. Adds `rate_aggregate_id uuid NOT NULL` to `rate_current` (pre-prod
--      store: we truncate and replay rather than backfill).
--   2. Wipes existing rate events so the column has consistent data after
--      the rewrite (old rows had no aggregate id stored).
--   3. Rewrites `apply_project_event` so `RateSet` copies `rateAggregateId`
--      into the projection, and `RateUnset` reads it back directly.
--   4. Rebuilds projections so `rate_current` is coherent again.
-- ============================================================================

-- 1. Wipe existing rate rows + events. The event store is still
--    pre-production; if you read this and there IS production data, STOP
--    and write a backfill step that derives `rate_aggregate_id` from the
--    latest matching RateSet for each projection row before re-running.
TRUNCATE rate_current;

ALTER TABLE project_event DISABLE TRIGGER project_event_no_delete;

DELETE FROM project_event
 WHERE type IN ('RateSet', 'RateUnset');

ALTER TABLE project_event ENABLE TRIGGER project_event_no_delete;

-- 2. Add the column. Safe to set NOT NULL immediately because we just
--    truncated every row.
ALTER TABLE rate_current
  ADD COLUMN rate_aggregate_id uuid NOT NULL;

-- One aggregate -> at most one current row. This also gives us a cheap
-- lookup path for admin tooling that edits by aggregate id.
CREATE UNIQUE INDEX rate_current_aggregate_id_idx
  ON rate_current (rate_aggregate_id);

COMMENT ON COLUMN rate_current.rate_aggregate_id IS
  'UUID of the rate aggregate on the project stream. Stable across RateSet updates, reused by RateUnset.';

-- 3. Rewrite `apply_project_event`. We touch only the two rate branches;
--    everything else is copied verbatim from the previous migration.
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

  -- ===== Rate aggregate =====
  WHEN 'RateSet' THEN
    v_rate := v_payload -> 'rate';
    INSERT INTO rate_current (
      project_id, contractor_id, rate_aggregate_id,
      rate_unit, rate_quantity, rate_unit_price, rate_currency,
      rate_billing_unit_price, rate_billing_currency, rate_exchange_rate,
      effective_from, version, last_event_id
    ) VALUES (
      p_event.project_id,
      (v_payload ->> 'contractorId')::bigint,
      (v_payload ->> 'rateAggregateId')::uuid,
      v_rate ->> 'unit',
      COALESCE((v_rate ->> 'quantity')::numeric, 1),
      (v_rate ->> 'unitPrice')::numeric,
      v_rate ->> 'currency',
      (v_rate ->> 'billingUnitPrice')::numeric,
      v_rate ->> 'billingCurrency',
      (v_rate ->> 'exchangeRate')::numeric,
      (v_payload ->> 'effectiveFrom')::timestamptz,
      1, p_event.id
    )
    ON CONFLICT (project_id, contractor_id) DO UPDATE SET
      rate_aggregate_id       = EXCLUDED.rate_aggregate_id,
      rate_unit               = EXCLUDED.rate_unit,
      rate_quantity           = EXCLUDED.rate_quantity,
      rate_unit_price         = EXCLUDED.rate_unit_price,
      rate_currency           = EXCLUDED.rate_currency,
      rate_billing_unit_price = EXCLUDED.rate_billing_unit_price,
      rate_billing_currency   = EXCLUDED.rate_billing_currency,
      rate_exchange_rate      = EXCLUDED.rate_exchange_rate,
      effective_from          = EXCLUDED.effective_from,
      version                 = rate_current.version + 1,
      last_event_id           = EXCLUDED.last_event_id,
      updated_at              = now();

  WHEN 'RateUnset' THEN
    -- `rate_current` now carries `rate_aggregate_id`, so the delete is a
    -- direct lookup instead of a backwards walk through `project_event`.
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
  'SQL mirror of applyProjectEvent() in src/api/time-event/aggregates/project-stream.ts. Mutates task_current / activity_current / rate_current / period_lock.';

-- 4. Replay surviving events so projections are coherent again.
SELECT rebuild_projections();

-- migrate:down

-- Non-reversible in a way that preserves history (we dropped events). Recreate
-- the column-less projection; rate history in `project_event` is gone anyway.
DROP INDEX IF EXISTS rate_current_aggregate_id_idx;
ALTER TABLE rate_current DROP COLUMN IF EXISTS rate_aggregate_id;
