-- ============================================================================
-- EVENT PROJECTIONS + APPEND RPCs (time_dev / time_prod)
-- ============================================================================
-- This migration turns the event store + projection tables wired up in the two
-- previous migrations into something that actually produces data. It creates:
--
--   1. `apply_contractor_event(event_row)`  — SQL mirror of
--      `src/api/time-event/aggregates/contractor-stream.ts :: applyContractorEvent`.
--      Projects every contractor event onto the `entry` table.
--   2. `apply_project_event(event_row)`  — SQL mirror of
--      `src/api/time-event/aggregates/project-stream.ts :: applyProjectEvent`.
--      Projects every project event onto `task_current`, `activity_current`,
--      `rate_current`, `period_lock`.
--   3. AFTER INSERT triggers on `contractor_event` / `project_event` that
--      invoke those functions, so projections are always up to date.
--   4. `append_contractor_event(...)` / `append_project_event(...)` RPCs
--      that atomically allocate `seq`, enforce idempotency on
--      (stream_id, client_event_id), check optimistic concurrency and
--      insert the row. The Worker's Supabase store calls these.
--   5. `rebuild_projections()` utility that truncates projection tables and
--      replays every event through the apply functions. Used by the
--      SQL↔TS equivalence test and by admins after disaster recovery.
--
-- Design rules
-- ------------
-- * All names are unqualified — the caller sets search_path to time_dev /
--   time_prod (see `scripts/dbmate-time.mjs`).
-- * Trigger + RPC bodies use SECURITY INVOKER so they read the caller's
--   search_path. Only service_role can insert into the event tables, so
--   this can't be abused by authenticated clients.
-- * Projection writes are intentionally "last-write-wins by seq". Every
--   projection table carries a `last_event_seq` / `last_event_id` column
--   and updates guard against regressing. This makes rebuilds safe to
--   run concurrently with normal writes (the worse case is a no-op).
-- * Mutation events (Stopped / Assigned / Tags / Approval ...) that target
--   an entry missing from the projection are a silent no-op rather than a
--   hard failure. During normal operation this should never happen because
--   events land in (contractor_id, seq) order; it keeps the rebuild path
--   resilient when projection data is being recomputed.
-- ============================================================================

-- migrate:up

-- ----------------------------------------------------------------------------
-- 0. Bookkeeping columns on `entry`
-- ----------------------------------------------------------------------------
-- The projection table predates this migration and only exposes
-- `last_event_id` + `last_event_seq`, which are enough for contractor event
-- projection (each entry is mutated by events from exactly one contractor
-- stream, so seq ordering is unambiguous). No schema change needed here.

-- ----------------------------------------------------------------------------
-- 1. Small helpers that mirror TypeScript utilities.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rate_quantity_from_duration(
  p_unit text,
  p_duration_seconds int
) RETURNS numeric
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  -- Mirrors `quantityFromDuration` in
  -- src/api/time-event/rate-snapshot.schema.ts. Only time units ('h','d')
  -- derive quantity from duration; other units (pieces/sessions) must be
  -- supplied explicitly via the rate snapshot and we leave quantity as-is.
  IF p_unit = 'h' THEN
    RETURN round((p_duration_seconds::numeric / 3600.0) * 10000) / 10000;
  ELSIF p_unit = 'd' THEN
    RETURN round((p_duration_seconds::numeric / 86400.0) * 10000) / 10000;
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

COMMENT ON FUNCTION rate_quantity_from_duration IS
  'Mirror of quantityFromDuration() — converts a stopped-entry duration into a realised quantity for time-based rate units.';

-- ----------------------------------------------------------------------------
-- 2. `apply_contractor_event(event_row)`
-- ----------------------------------------------------------------------------
-- Walks the payload shape defined in
-- `src/api/time-event/contractor-event.schema.ts` and mutates the `entry`
-- read model accordingly. Every branch mirrors a case in
-- `applyContractorEvent` (contractor-stream.ts).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_contractor_event(p_event contractor_event)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_payload   jsonb := p_event.payload;
  v_type      text  := p_event.type;
  v_entry_id  uuid;
  v_src       entry;
  v_ids       uuid[];
  v_rate      jsonb;
  v_duration  int;
  v_quantity  numeric;
  v_net_value numeric;
  v_left_id   uuid;
  v_right_id  uuid;
  v_merged_id uuid;
  v_start_ms  bigint;
  v_gap_ms    bigint;
  v_split_at  timestamptz;
  v_right_started_at timestamptz;
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
      rate_billing_unit_price, rate_billing_currency,
      rate_exchange_rate, rate_net_value,
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
      NULL, -- stopped_at
      NULLIF(v_payload ->> 'description', ''),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_payload -> 'tags')), ARRAY[]::text[]),
      v_rate ->> 'unit',
      COALESCE((v_rate ->> 'quantity')::numeric, 0),
      (v_rate ->> 'unitPrice')::numeric,
      v_rate ->> 'currency',
      (v_rate ->> 'billingUnitPrice')::numeric,
      v_rate ->> 'billingCurrency',
      (v_rate ->> 'exchangeRate')::numeric,
      COALESCE((v_rate ->> 'netValue')::numeric, 0),
      COALESCE((v_payload ->> 'isPlaceholder')::boolean, false),
      'draft',
      NULLIF(v_payload ->> 'interruptedEntryId', '')::uuid,
      NULLIF(v_payload ->> 'resumedFromEntryId', '')::uuid,
      1, p_event.id, p_event.seq
    )
    ON CONFLICT (id) DO NOTHING; -- idempotent for rebuilds

  WHEN 'EntryStopped' THEN
    -- We also recompute rate_quantity / rate_net_value for time-based units
    -- since the start event couldn't know the duration.
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
    v_gap_ms         := COALESCE((v_payload ->> 'gapSeconds')::bigint, 0) * 1000;
    v_right_started_at := v_split_at + make_interval(secs => (v_gap_ms / 1000.0));

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
      rate_billing_unit_price, rate_billing_currency,
      rate_exchange_rate, rate_net_value,
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
        v_src.rate_billing_unit_price, v_src.rate_billing_currency,
        v_src.rate_exchange_rate,
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
        v_src.rate_billing_unit_price, v_src.rate_billing_currency,
        v_src.rate_exchange_rate,
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

    -- Use the "left" entry as the base; copy its attributes and span the
    -- two start/stop windows to cover both.
    SELECT * INTO v_src FROM entry WHERE id = v_left_id;
    IF v_src.id IS NULL THEN
      RETURN;
    END IF;

    INSERT INTO entry (
      id, contractor_id, client_id, workspace_id, project_id,
      task_id, task_version, activity_id, activity_version,
      started_at, stopped_at, description, tags,
      rate_unit, rate_quantity, rate_unit_price, rate_currency,
      rate_billing_unit_price, rate_billing_currency,
      rate_exchange_rate, rate_net_value,
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
      v_src.rate_billing_unit_price, v_src.rate_billing_currency,
      v_src.rate_exchange_rate,
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

    -- Tombstone the source entries.
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
      rate_unit               = v_rate ->> 'unit',
      rate_quantity           = COALESCE((v_rate ->> 'quantity')::numeric, rate_quantity),
      rate_unit_price         = (v_rate ->> 'unitPrice')::numeric,
      rate_currency           = v_rate ->> 'currency',
      rate_billing_unit_price = (v_rate ->> 'billingUnitPrice')::numeric,
      rate_billing_currency   = v_rate ->> 'billingCurrency',
      rate_exchange_rate      = (v_rate ->> 'exchangeRate')::numeric,
      rate_net_value          = COALESCE((v_rate ->> 'netValue')::numeric, rate_net_value),
      event_count             = event_count + 1,
      last_event_id           = p_event.id,
      last_event_seq          = p_event.seq,
      updated_at              = now()
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
      rate_billing_unit_price, rate_billing_currency,
      rate_exchange_rate, rate_net_value,
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
      (v_rate ->> 'billingUnitPrice')::numeric,
      v_rate ->> 'billingCurrency',
      (v_rate ->> 'exchangeRate')::numeric,
      v_net_value,
      COALESCE((v_payload ->> 'isPlaceholder')::boolean, false),
      'draft',
      NULL, NULL,
      1, p_event.id, p_event.seq
    )
    ON CONFLICT (id) DO NOTHING;

  ELSE
    -- Unknown types are tolerated so that rolling out a new TS event doesn't
    -- immediately wedge the projection — the trigger simply no-ops until a
    -- matching branch is deployed.
    RAISE NOTICE 'apply_contractor_event: unknown event type %, skipping (seq=%)', v_type, p_event.seq;
  END CASE;
END;
$$;

COMMENT ON FUNCTION apply_contractor_event IS
  'SQL mirror of applyContractorEvent() in src/api/time-event/aggregates/contractor-stream.ts. Mutates the `entry` projection.';

-- ----------------------------------------------------------------------------
-- 3. `apply_project_event(event_row)`
-- ----------------------------------------------------------------------------
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
        ARRAY(SELECT (jsonb_array_elements_text(v_payload -> 'assignees'))::uuid),
        ARRAY[]::uuid[]
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
        WHEN (v_payload ->> 'userId')::uuid = ANY(assignees) THEN assignees
        ELSE array_append(assignees, (v_payload ->> 'userId')::uuid)
      END,
      version       = version + 1,
      last_event_id = p_event.id,
      updated_at    = now()
    WHERE id = (v_payload ->> 'taskId')::uuid;

  WHEN 'TaskUnassigned' THEN
    UPDATE task_current SET
      assignees     = array_remove(assignees, (v_payload ->> 'userId')::uuid),
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
    -- `rate_current` is keyed by (project_id, contractor_id) but a
    -- `RateUnset` event only carries `rateAggregateId`. To find the row to
    -- drop, we walk back through `project_event` for the most recent
    -- `RateSet` for the same aggregate id — that payload carries the
    -- `contractorId` we need.
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

-- ----------------------------------------------------------------------------
-- 4. Projection triggers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_apply_contractor_event()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  PERFORM apply_contractor_event(NEW);
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION trg_apply_project_event()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  PERFORM apply_project_event(NEW);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS contractor_event_apply ON contractor_event;
CREATE TRIGGER contractor_event_apply
  AFTER INSERT ON contractor_event
  FOR EACH ROW
  EXECUTE FUNCTION trg_apply_contractor_event();

DROP TRIGGER IF EXISTS project_event_apply ON project_event;
CREATE TRIGGER project_event_apply
  AFTER INSERT ON project_event
  FOR EACH ROW
  EXECUTE FUNCTION trg_apply_project_event();

-- ----------------------------------------------------------------------------
-- 5. `rebuild_projections()` — truncate + replay everything.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION rebuild_projections()
RETURNS TABLE (
  stream      text,
  replayed    bigint,
  skipped     bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  r_contractor       contractor_event;
  r_project          project_event;
  v_contractor_ok    bigint := 0;
  v_contractor_skip  bigint := 0;
  v_project_ok       bigint := 0;
  v_project_skip     bigint := 0;
BEGIN
  TRUNCATE entry, task_current, activity_current, rate_current, period_lock RESTART IDENTITY;

  -- We wrap every apply call in an EXCEPTION block so that a single
  -- malformed legacy event (e.g. left over from smoke tests before the
  -- schema was locked down by the worker) cannot poison the entire rebuild.
  -- Offending events are logged as NOTICEs and surfaced via the `skipped`
  -- count; the caller can chase them down via received_at ordering.
  FOR r_contractor IN
    SELECT * FROM contractor_event ORDER BY contractor_id, seq
  LOOP
    BEGIN
      PERFORM apply_contractor_event(r_contractor);
      v_contractor_ok := v_contractor_ok + 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_contractor_skip := v_contractor_skip + 1;
        RAISE NOTICE
          'rebuild_projections: skipped contractor_event id=% seq=% type=% err=%',
          r_contractor.id, r_contractor.seq, r_contractor.type, SQLERRM;
    END;
  END LOOP;

  FOR r_project IN
    SELECT * FROM project_event ORDER BY project_id, seq
  LOOP
    BEGIN
      PERFORM apply_project_event(r_project);
      v_project_ok := v_project_ok + 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_project_skip := v_project_skip + 1;
        RAISE NOTICE
          'rebuild_projections: skipped project_event id=% seq=% type=% err=%',
          r_project.id, r_project.seq, r_project.type, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY VALUES
    ('contractor', v_contractor_ok, v_contractor_skip),
    ('project',    v_project_ok,    v_project_skip);
END;
$$;

COMMENT ON FUNCTION rebuild_projections IS
  'Truncate every projection table and replay all events through the apply_* functions. For disaster recovery and the SQL↔TS equivalence test.';

REVOKE EXECUTE ON FUNCTION rebuild_projections() FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. Append RPCs — atomic seq allocation + idempotency + concurrency check
-- ----------------------------------------------------------------------------
-- Return shape for both functions:
--   { outcome: 'accepted'       , seq, eventId, receivedAt }
--   { outcome: 'duplicate'      , seq }                     (existing event_id)
--   { outcome: 'conflict'       , expected, actual }        (concurrency)
-- Worker maps these to HTTP 201 / 200 / 409.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION append_contractor_event(
  p_contractor_id           bigint,
  p_type                    text,
  p_payload                 jsonb,
  p_client_event_id         uuid,
  p_actor_user_id           uuid,
  p_correlation_id          uuid,
  p_causation_id            uuid,
  p_event_version           int,
  p_expected_stream_version int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_existing_seq bigint;
  v_existing_id  uuid;
  v_current_head bigint;
  v_seq          bigint;
  v_event_id     uuid;
  v_received_at  timestamptz;
  v_lock_key     bigint;
BEGIN
  -- 1. Fast dedup outside the lock — avoids holding advisory locks on hot
  --    client retries that simply look up the previous outcome.
  SELECT seq, id INTO v_existing_seq, v_existing_id
    FROM contractor_event
   WHERE contractor_id = p_contractor_id
     AND client_event_id = p_client_event_id
   LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'duplicate',
      'seq', v_existing_seq,
      'eventId', v_existing_id
    );
  END IF;

  -- 2. Serialize seq allocation for this stream.
  v_lock_key := hashtextextended('contractor:' || p_contractor_id::text, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 3. Re-check under the lock.
  SELECT seq, id INTO v_existing_seq, v_existing_id
    FROM contractor_event
   WHERE contractor_id = p_contractor_id
     AND client_event_id = p_client_event_id
   LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'duplicate',
      'seq', v_existing_seq,
      'eventId', v_existing_id
    );
  END IF;

  -- 4. Optimistic-concurrency check against the head.
  SELECT last_seq INTO v_current_head
    FROM contractor_stream_head
   WHERE contractor_id = p_contractor_id;
  v_current_head := COALESCE(v_current_head, 0);

  IF p_expected_stream_version IS NOT NULL
     AND p_expected_stream_version <> v_current_head THEN
    RETURN jsonb_build_object(
      'outcome',  'conflict',
      'expected', p_expected_stream_version,
      'actual',   v_current_head
    );
  END IF;

  v_seq := v_current_head + 1;

  INSERT INTO contractor_event (
    id, contractor_id, seq, type, payload, client_event_id,
    actor_user_id, prev_event_id, correlation_id, causation_id, event_version
  ) VALUES (
    gen_random_uuid(), p_contractor_id, v_seq, p_type, p_payload, p_client_event_id,
    p_actor_user_id, NULL, p_correlation_id, p_causation_id,
    COALESCE(p_event_version, 1)
  )
  RETURNING id, received_at INTO v_event_id, v_received_at;

  RETURN jsonb_build_object(
    'outcome',    'accepted',
    'seq',        v_seq,
    'eventId',    v_event_id,
    'receivedAt', v_received_at
  );
END;
$$;

COMMENT ON FUNCTION append_contractor_event IS
  'Atomic append to contractor_event: dedup on (contractor_id, client_event_id), seq = head + 1, guards against expected_stream_version drift. Called by the worker''s SupabaseTimeEventStore.';

CREATE OR REPLACE FUNCTION append_project_event(
  p_project_id                 bigint,
  p_aggregate_kind             text,
  p_aggregate_id               uuid,
  p_type                       text,
  p_payload                    jsonb,
  p_client_event_id            uuid,
  p_actor_user_id              uuid,
  p_correlation_id             uuid,
  p_causation_id               uuid,
  p_event_version              int,
  p_expected_aggregate_version int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_existing_seq bigint;
  v_existing_id  uuid;
  v_head_seq     bigint;
  v_agg_version  int;
  v_seq          bigint;
  v_event_id     uuid;
  v_received_at  timestamptz;
  v_lock_key     bigint;
BEGIN
  -- 1. Dedup (project-wide clientEventId uniqueness).
  SELECT seq, id INTO v_existing_seq, v_existing_id
    FROM project_event
   WHERE project_id = p_project_id
     AND client_event_id = p_client_event_id
   LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'duplicate',
      'seq',     v_existing_seq,
      'eventId', v_existing_id
    );
  END IF;

  v_lock_key := hashtextextended('project:' || p_project_id::text, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT seq, id INTO v_existing_seq, v_existing_id
    FROM project_event
   WHERE project_id = p_project_id
     AND client_event_id = p_client_event_id
   LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'duplicate',
      'seq',     v_existing_seq,
      'eventId', v_existing_id
    );
  END IF;

  -- 2. Per-aggregate optimistic concurrency. The project_aggregate_head
  --    row is maintained by a separate trigger; absent row means the
  --    aggregate has no history yet and expected_version must be 0.
  SELECT version INTO v_agg_version
    FROM project_aggregate_head
   WHERE project_id     = p_project_id
     AND aggregate_kind = p_aggregate_kind
     AND aggregate_id   = p_aggregate_id;
  v_agg_version := COALESCE(v_agg_version, 0);

  IF p_expected_aggregate_version IS NOT NULL
     AND p_expected_aggregate_version <> v_agg_version THEN
    RETURN jsonb_build_object(
      'outcome',  'conflict',
      'expected', p_expected_aggregate_version,
      'actual',   v_agg_version
    );
  END IF;

  -- 3. Allocate stream seq = head + 1.
  SELECT last_seq INTO v_head_seq
    FROM project_stream_head
   WHERE project_id = p_project_id;
  v_seq := COALESCE(v_head_seq, 0) + 1;

  INSERT INTO project_event (
    id, project_id, seq, aggregate_kind, aggregate_id, type, payload,
    client_event_id, actor_user_id, prev_event_id, correlation_id,
    causation_id, event_version
  ) VALUES (
    gen_random_uuid(), p_project_id, v_seq, p_aggregate_kind, p_aggregate_id,
    p_type, p_payload, p_client_event_id, p_actor_user_id, NULL,
    p_correlation_id, p_causation_id, COALESCE(p_event_version, 1)
  )
  RETURNING id, received_at INTO v_event_id, v_received_at;

  RETURN jsonb_build_object(
    'outcome',    'accepted',
    'seq',        v_seq,
    'eventId',    v_event_id,
    'receivedAt', v_received_at
  );
END;
$$;

COMMENT ON FUNCTION append_project_event IS
  'Atomic append to project_event: dedup on (project_id, client_event_id), seq = head + 1, per-aggregate optimistic concurrency via project_aggregate_head.version. Called by the worker''s SupabaseTimeEventStore.';

-- Only service_role should be able to call these — authenticated users must
-- go through the Worker.
REVOKE EXECUTE ON FUNCTION append_contractor_event(bigint, text, jsonb, uuid, uuid, uuid, uuid, int, int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION append_project_event(bigint, text, uuid, text, jsonb, uuid, uuid, uuid, uuid, int, int) FROM PUBLIC, anon, authenticated;

-- migrate:down

-- Forward-only: see the top-of-file comment in
-- 20260419120000_add_event_store.sql.
