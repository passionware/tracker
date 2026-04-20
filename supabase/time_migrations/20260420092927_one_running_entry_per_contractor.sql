-- migrate:up

-- ============================================================================
-- One-running-entry-per-contractor invariant
-- ============================================================================
--
-- A contractor is allowed AT MOST ONE running time entry at any given moment.
-- "Jump on" (pausing the primary to help a teammate) is now modelled as a
-- stop-then-start pivot under a single correlation id, not as two parallel
-- live lanes.
--
-- This invariant is enforced in two places:
--   1. `validateContractorEvent` in TS (rejects EntryStarted while any entry
--      is still open for the same contractor).
--   2. Here — a partial UNIQUE index on `entry(contractor_id)` scoped to
--      rows where `stopped_at IS NULL AND deleted_at IS NULL`. The index is
--      the hard guarantee: it catches any path that somehow bypasses the
--      validator (rogue client, tmetric backfill collision, replay into a
--      wiped projection, …).
--
-- Pre-existing data wipe
-- ----------------------
-- During development the old tracker happily produced parallel running
-- entries (jump-on ran alongside the primary). Those events + the projected
-- rows would now block the CREATE UNIQUE INDEX below, so we wipe the
-- contractor event stream and its projection and let the UI re-emit events
-- under the new rules. Same pattern as `20260420090233_assignees_use_contractor_id.sql`
-- used for project-event cleanup.
--
-- If you read this in production and there IS real data, STOP. Convert the
-- cleanup into a per-contractor "stop the older of each overlapping pair"
-- script before re-running.
-- ============================================================================

-- 1. Empty the projection so the index can be created cleanly.
TRUNCATE entry;

-- 2. Drop all contractor events (timer starts / stops / descriptions / …).
--    The append-only trigger is temporarily disabled exactly as the
--    assignees migration does.
ALTER TABLE contractor_event DISABLE TRIGGER contractor_event_no_delete;
DELETE FROM contractor_event;
ALTER TABLE contractor_event ENABLE TRIGGER contractor_event_no_delete;

-- 3. Replace the existing non-unique hot-path index with a UNIQUE partial
--    index that enforces the invariant. Predicate matches exactly, so the
--    query planner will still pick it up for "current running entry"
--    lookups on `useActiveEntry(contractorId)`.
DROP INDEX IF EXISTS entry_active_idx;

CREATE UNIQUE INDEX entry_one_running_per_contractor_idx
  ON entry (contractor_id)
  WHERE stopped_at IS NULL AND deleted_at IS NULL;

COMMENT ON INDEX entry_one_running_per_contractor_idx IS
  'At most one open entry per contractor. Mirrors validateContractorEvent''s '
  '"entry.concurrent_timer" rejection — jump-on is now a stop-then-start pivot.';

-- 4. Rebuild any derived state (no contractor events to replay, so this is
--    a no-op for `entry`; included for symmetry with sibling migrations and
--    so periodic lock / rate projections catch any drift).
SELECT rebuild_projections();

-- migrate:down

DROP INDEX IF EXISTS entry_one_running_per_contractor_idx;

CREATE INDEX entry_active_idx
  ON entry (contractor_id, started_at DESC)
  WHERE stopped_at IS NULL AND deleted_at IS NULL;
