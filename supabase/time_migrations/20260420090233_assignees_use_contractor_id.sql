-- migrate:up

-- ============================================================================
-- task_current.assignees: uuid[] (auth.users.id) -> bigint[] (contractor.id)
-- ============================================================================
--
-- The original event store keyed task assignees by Supabase auth uid. That
-- conflated two things:
--   1. "Who can do this task?" — a domain concept that belongs on our
--      `contractor` entity (which has a numeric id and lives independently
--      of whether the person ever logs into Supabase).
--   2. "Who is currently signed in?" — an auth concern that should be mapped
--      to a contractor via a future `contractor.auth_user_id` column.
--
-- This migration switches assignees to `contractor.id` (bigint) end-to-end.
-- Because there is no meaningful auto-translation from existing auth uids to
-- contractor ids, we wipe every Task* event from `project_event` and let the
-- worker / UI rebuild the assignment graph from the new typed payloads.
--
-- This is safe to do at this point because the time event store is still
-- pre-production. If you read this and there IS production data, STOP and
-- write a translation step (look up contractor by auth_user_id) before
-- re-running.
-- ============================================================================

-- 1. Drop indexes that depend on the column type so we can ALTER it.
DROP INDEX IF EXISTS task_current_assignees_gin;
DROP INDEX IF EXISTS task_current_open_assignees_gin;

-- 2. Wipe task_current first so the column type swap doesn't have to convert
--    any rows — by the time we replay surviving events the column will be
--    the new type.
TRUNCATE task_current;

-- 3. Swap the column type. USING '{}'::bigint[] is unconditional because
--    every row was just truncated; no data preservation is attempted.
ALTER TABLE task_current
  ALTER COLUMN assignees DROP DEFAULT,
  ALTER COLUMN assignees TYPE bigint[] USING ARRAY[]::bigint[],
  ALTER COLUMN assignees SET DEFAULT '{}'::bigint[];

-- 4. Recreate the GIN indexes on the new type.
CREATE INDEX task_current_assignees_gin
  ON task_current USING gin (assignees);
CREATE INDEX task_current_open_assignees_gin
  ON task_current USING gin (assignees)
  WHERE completed_at IS NULL AND is_archived = false;

COMMENT ON COLUMN task_current.assignees IS
  'contractor.id (bigint) values of contractors who can see this task in their suggestions. Mapped to a Supabase auth user via contractor.auth_user_id.';

-- 5. Drop every Task* event. Their JSONB payloads still carry the old
--    UUID-based shape and would now fail the rewritten apply function.
--    Rates / activities / period locks are unaffected — their schemas did
--    not change.
--
--    `project_event` has append-only triggers (reject_event_mutation). We
--    disable them just for the scope of this migration and re-enable
--    immediately afterwards so the audit-trail invariant is restored.
ALTER TABLE project_event DISABLE TRIGGER project_event_no_delete;

DELETE FROM project_event
 WHERE type IN (
   'TaskCreated',
   'TaskRenamed',
   'TaskDescriptionChanged',
   'TaskExternalLinkAdded',
   'TaskExternalLinkRemoved',
   'TaskAssigned',
   'TaskUnassigned',
   'TaskEstimateSet',
   'TaskCompleted',
   'TaskReopened',
   'TaskArchived',
   'TaskUnarchived'
 );

ALTER TABLE project_event ENABLE TRIGGER project_event_no_delete;

-- 6. Rewrite the apply function. Only the TaskCreated / TaskAssigned /
--    TaskUnassigned branches actually changed; the rest are reproduced
--    verbatim so this file is a complete, current definition.
CREATE OR REPLACE FUNCTION apply_project_event(p_event project_event)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
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
      id, project_id, client_id, name, description,
      external_links, assignees, estimate_quantity, estimate_unit,
      version, last_event_id
    ) VALUES (
      (v_payload ->> 'taskId')::uuid,
      p_event.project_id,
      (v_payload ->> 'clientId')::bigint,
      v_payload ->> 'name',
      NULLIF(v_payload ->> 'description', ''),
      COALESCE(v_payload -> 'externalLinks', '[]'::jsonb),
      COALESCE(
        ARRAY(SELECT (jsonb_array_elements_text(v_payload -> 'assignees'))::bigint),
        ARRAY[]::bigint[]
      ),
      NULLIF(v_payload #>> '{estimate,quantity}', '')::numeric,
      NULLIF(v_payload #>> '{estimate,unit}', ''),
      1, p_event.id
    )
    ON CONFLICT (id) DO UPDATE SET
      project_id        = EXCLUDED.project_id,
      client_id         = EXCLUDED.client_id,
      name              = EXCLUDED.name,
      description       = EXCLUDED.description,
      external_links    = EXCLUDED.external_links,
      assignees         = EXCLUDED.assignees,
      estimate_quantity = EXCLUDED.estimate_quantity,
      estimate_unit     = EXCLUDED.estimate_unit,
      version           = task_current.version + 1,
      last_event_id     = EXCLUDED.last_event_id,
      updated_at        = now();

  WHEN 'TaskRenamed' THEN
    UPDATE task_current SET
      name          = v_payload ->> 'name',
      version       = version + 1,
      last_event_id = p_event.id,
      updated_at    = now()
    WHERE id = (v_payload ->> 'taskId')::uuid;

  WHEN 'TaskDescriptionChanged' THEN
    UPDATE task_current SET
      description   = NULLIF(v_payload ->> 'description', ''),
      version       = version + 1,
      last_event_id = p_event.id,
      updated_at    = now()
    WHERE id = (v_payload ->> 'taskId')::uuid;

  WHEN 'TaskExternalLinkAdded' THEN
    UPDATE task_current SET
      external_links = external_links || jsonb_build_array(v_payload -> 'link'),
      version        = version + 1,
      last_event_id  = p_event.id,
      updated_at     = now()
    WHERE id = (v_payload ->> 'taskId')::uuid;

  WHEN 'TaskExternalLinkRemoved' THEN
    UPDATE task_current SET
      external_links = COALESCE(
        (
          SELECT jsonb_agg(link)
          FROM jsonb_array_elements(external_links) link
          WHERE NOT (
            link ->> 'provider'   = v_payload ->> 'provider'
            AND link ->> 'externalId' = v_payload ->> 'externalId'
          )
        ),
        '[]'::jsonb
      ),
      version        = version + 1,
      last_event_id  = p_event.id,
      updated_at     = now()
    WHERE id = (v_payload ->> 'taskId')::uuid;

  WHEN 'TaskAssigned' THEN
    UPDATE task_current SET
      assignees = CASE
        WHEN (v_payload ->> 'contractorId')::bigint = ANY(assignees) THEN assignees
        ELSE array_append(assignees, (v_payload ->> 'contractorId')::bigint)
      END,
      version       = version + 1,
      last_event_id = p_event.id,
      updated_at    = now()
    WHERE id = (v_payload ->> 'taskId')::uuid;

  WHEN 'TaskUnassigned' THEN
    UPDATE task_current SET
      assignees     = array_remove(assignees, (v_payload ->> 'contractorId')::bigint),
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
      id, project_id, name, description, kinds, version, last_event_id
    ) VALUES (
      (v_payload ->> 'activityId')::uuid,
      p_event.project_id,
      v_payload ->> 'name',
      NULLIF(v_payload ->> 'description', ''),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_payload -> 'kinds')), ARRAY[]::text[]),
      1, p_event.id
    )
    ON CONFLICT (id) DO UPDATE SET
      project_id    = EXCLUDED.project_id,
      name          = EXCLUDED.name,
      description   = EXCLUDED.description,
      kinds         = EXCLUDED.kinds,
      version       = activity_current.version + 1,
      last_event_id = EXCLUDED.last_event_id,
      updated_at    = now();

  WHEN 'ActivityRenamed' THEN
    UPDATE activity_current SET
      name          = v_payload ->> 'name',
      version       = version + 1,
      last_event_id = p_event.id,
      updated_at    = now()
    WHERE id = (v_payload ->> 'activityId')::uuid;

  WHEN 'ActivityDescriptionChanged' THEN
    UPDATE activity_current SET
      description   = NULLIF(v_payload ->> 'description', ''),
      version       = version + 1,
      last_event_id = p_event.id,
      updated_at    = now()
    WHERE id = (v_payload ->> 'activityId')::uuid;

  WHEN 'ActivityKindsChanged' THEN
    UPDATE activity_current SET
      kinds         = COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_payload -> 'kinds')), ARRAY[]::text[]),
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
      project_id, contractor_id,
      rate_unit, rate_quantity, rate_unit_price, rate_currency,
      rate_billing_unit_price, rate_billing_currency, rate_exchange_rate,
      effective_from, version, last_event_id
    ) VALUES (
      p_event.project_id,
      (v_payload ->> 'contractorId')::bigint,
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
    DELETE FROM rate_current rc
     WHERE rc.project_id = p_event.project_id
       AND rc.contractor_id = (
         SELECT (pe.payload ->> 'contractorId')::bigint
           FROM project_event pe
          WHERE pe.project_id     = p_event.project_id
            AND pe.aggregate_kind = 'rate'
            AND pe.aggregate_id   = p_event.aggregate_id
            AND pe.type           = 'RateSet'
          ORDER BY pe.seq DESC
          LIMIT 1
       );

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

-- 7. Replay surviving events so projections are coherent again.
SELECT rebuild_projections();


-- migrate:down

-- The up migration drops Task* events; the down migration cannot resurrect
-- them. We restore the column type so the DB shape matches the code at the
-- prior revision, but the `apply_project_event` function is left as-is —
-- after `dbmate down` you MUST also re-run the prior migration
-- (20260420074612_add_event_projections_and_append_rpcs.sql) to reinstall
-- the uuid-based apply function. Otherwise the rewritten function will
-- reject every TaskCreated event it sees.

DROP INDEX IF EXISTS task_current_assignees_gin;
DROP INDEX IF EXISTS task_current_open_assignees_gin;

TRUNCATE task_current;

ALTER TABLE task_current
  ALTER COLUMN assignees DROP DEFAULT,
  ALTER COLUMN assignees TYPE uuid[] USING ARRAY[]::uuid[],
  ALTER COLUMN assignees SET DEFAULT '{}'::uuid[];

CREATE INDEX task_current_assignees_gin
  ON task_current USING gin (assignees);
CREATE INDEX task_current_open_assignees_gin
  ON task_current USING gin (assignees)
  WHERE completed_at IS NULL AND is_archived = false;

COMMENT ON COLUMN task_current.assignees IS
  'auth.uid() values of contractors who can see this task in their suggestions.';

ALTER TABLE project_event DISABLE TRIGGER project_event_no_delete;

DELETE FROM project_event
 WHERE type IN (
   'TaskCreated',
   'TaskRenamed',
   'TaskDescriptionChanged',
   'TaskExternalLinkAdded',
   'TaskExternalLinkRemoved',
   'TaskAssigned',
   'TaskUnassigned',
   'TaskEstimateSet',
   'TaskCompleted',
   'TaskReopened',
   'TaskArchived',
   'TaskUnarchived'
 );

ALTER TABLE project_event ENABLE TRIGGER project_event_no_delete;

DO $$
BEGIN
  RAISE NOTICE
    'apply_project_event still references the new contractorId payload shape. '
    'Re-run migration 20260420074612 to restore the prior uuid-based function '
    'before applying any new project events.';
END
$$;
