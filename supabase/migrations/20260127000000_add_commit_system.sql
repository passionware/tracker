-- ============================================================================
-- COMMIT SYSTEM FOR REPORTS, BILLING, AND COSTS
-- ============================================================================
-- This migration adds a commit system that prevents updates/deletes on
-- committed items and provides RPC functions to commit/undo them.
-- Links are considered committed if both parties (report-billing or report-cost)
-- are committed.
-- ============================================================================

-- ============================================================================
-- 1. ADD is_committed COLUMN TO TABLES
-- ============================================================================

-- Add is_committed to report table
ALTER TABLE report
ADD COLUMN IF NOT EXISTS "is_committed" boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN report.is_committed IS 'When true, prevents updates and deletes to this report';

-- Add is_committed to billing table
ALTER TABLE billing
ADD COLUMN IF NOT EXISTS "is_committed" boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN billing.is_committed IS 'When true, prevents updates and deletes to this billing';

-- Add is_committed to cost table
ALTER TABLE cost
ADD COLUMN IF NOT EXISTS "is_committed" boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN cost.is_committed IS 'When true, prevents updates and deletes to this cost';

-- ============================================================================
-- 2. HELPER FUNCTIONS FOR WORKSPACE ACCESS AND COMMIT CHECKS
-- ============================================================================

-- Base function: Check if current user belongs to a workspace
CREATE OR REPLACE FUNCTION user_belongs_to_workspace(
  p_workspace_id bigint
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM link_workspace_user lwu
    WHERE lwu.workspace_id = p_workspace_id
      AND lwu.user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION user_belongs_to_workspace IS 'Returns true if the current user belongs to the specified workspace';

-- Helper function to check if a report belongs to user's workspace
CREATE OR REPLACE FUNCTION report_belongs_to_user_workspace(
  p_report_id bigint
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM report r
    WHERE r.id = p_report_id
      AND user_belongs_to_workspace(r.workspace_id)
  );
$$;

COMMENT ON FUNCTION report_belongs_to_user_workspace IS 'Returns true if the report belongs to a workspace the current user has access to';

-- Helper function to check if a billing belongs to user's workspace
CREATE OR REPLACE FUNCTION billing_belongs_to_user_workspace(
  p_billing_id bigint
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM billing b
    JOIN link_workspace_client lwc ON b.client_id = lwc.client_id
      AND b.workspace_id = lwc.workspace_id
    WHERE b.id = p_billing_id
      AND user_belongs_to_workspace(b.workspace_id)
  );
$$;

COMMENT ON FUNCTION billing_belongs_to_user_workspace IS 'Returns true if the billing belongs to a workspace the current user has access to';

-- Helper function to check if a cost belongs to user's workspace
CREATE OR REPLACE FUNCTION cost_belongs_to_user_workspace(
  p_cost_id bigint
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM cost c
    WHERE c.id = p_cost_id
      AND user_belongs_to_workspace(c.workspace_id)
  );
$$;

COMMENT ON FUNCTION cost_belongs_to_user_workspace IS 'Returns true if the cost belongs to a workspace the current user has access to';

-- Helper function to check if a link_billing_report belongs to user's workspace
CREATE OR REPLACE FUNCTION link_billing_report_belongs_to_user_workspace(
  p_link_id bigint
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM link_billing_report lbr
    WHERE lbr.id = p_link_id
      AND (
        (lbr.report_id IS NOT NULL AND report_belongs_to_user_workspace(lbr.report_id))
        OR
        (lbr.billing_id IS NOT NULL AND billing_belongs_to_user_workspace(lbr.billing_id))
      )
  );
$$;

COMMENT ON FUNCTION link_billing_report_belongs_to_user_workspace IS 'Returns true if the link belongs to a workspace the current user has access to';

-- Helper function to check if a link_cost_report belongs to user's workspace
CREATE OR REPLACE FUNCTION link_cost_report_belongs_to_user_workspace(
  p_link_id bigint
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM link_cost_report lcr
    WHERE lcr.id = p_link_id
      AND (
        (lcr.cost_id IS NULL OR cost_belongs_to_user_workspace(lcr.cost_id))
        AND
        (lcr.report_id IS NULL OR report_belongs_to_user_workspace(lcr.report_id))
      )
  );
$$;

COMMENT ON FUNCTION link_cost_report_belongs_to_user_workspace IS 'Returns true if the link belongs to a workspace the current user has access to';

-- ============================================================================
-- 3. HELPER FUNCTIONS TO CHECK IF LINKS ARE COMMITTED
-- ============================================================================

-- Function to check if a link_billing_report is committed
-- For clarification links: if only one party is present, only that party needs to be committed
-- For regular links: if both parties are present, both must be committed
CREATE OR REPLACE FUNCTION is_link_billing_report_committed(
  p_link_id bigint
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_billing_id bigint;
  v_report_id bigint;
  v_billing_committed boolean;
  v_report_committed boolean;
BEGIN
  SELECT 
    lbr.billing_id,
    lbr.report_id,
    COALESCE(b.is_committed, false),
    COALESCE(r.is_committed, false)
  INTO 
    v_billing_id,
    v_report_id,
    v_billing_committed,
    v_report_committed
  FROM link_billing_report lbr
  LEFT JOIN billing b ON lbr.billing_id = b.id
  LEFT JOIN report r ON lbr.report_id = r.id
  WHERE lbr.id = p_link_id;
  
  -- If only billing is present (clarification link), only billing needs to be committed
  IF v_billing_id IS NOT NULL AND v_report_id IS NULL THEN
    RETURN v_billing_committed;
  END IF;
  
  -- If only report is present (clarification link), only report needs to be committed
  IF v_billing_id IS NULL AND v_report_id IS NOT NULL THEN
    RETURN v_report_committed;
  END IF;
  
  -- If both are present, both must be committed
  IF v_billing_id IS NOT NULL AND v_report_id IS NOT NULL THEN
    RETURN v_billing_committed AND v_report_committed;
  END IF;
  
  -- If neither is present (shouldn't happen), link is not committed
  RETURN false;
END;
$$;

COMMENT ON FUNCTION is_link_billing_report_committed IS 'Returns true if the link is committed. For clarification links (only one party), only that party needs to be committed. For regular links (both parties), both must be committed';

-- Function to check if a link_cost_report is committed
-- For clarification links: if only one party is present, only that party needs to be committed
-- For regular links: if both parties are present, both must be committed
CREATE OR REPLACE FUNCTION is_link_cost_report_committed(
  p_link_id bigint
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_cost_id bigint;
  v_report_id bigint;
  v_cost_committed boolean;
  v_report_committed boolean;
BEGIN
  SELECT 
    lcr.cost_id,
    lcr.report_id,
    COALESCE(c.is_committed, false),
    COALESCE(r.is_committed, false)
  INTO 
    v_cost_id,
    v_report_id,
    v_cost_committed,
    v_report_committed
  FROM link_cost_report lcr
  LEFT JOIN cost c ON lcr.cost_id = c.id
  LEFT JOIN report r ON lcr.report_id = r.id
  WHERE lcr.id = p_link_id;
  
  -- If only cost is present (clarification link), only cost needs to be committed
  IF v_cost_id IS NOT NULL AND v_report_id IS NULL THEN
    RETURN v_cost_committed;
  END IF;
  
  -- If only report is present (clarification link), only report needs to be committed
  IF v_cost_id IS NULL AND v_report_id IS NOT NULL THEN
    RETURN v_report_committed;
  END IF;
  
  -- If both are present, both must be committed
  IF v_cost_id IS NOT NULL AND v_report_id IS NOT NULL THEN
    RETURN v_cost_committed AND v_report_committed;
  END IF;
  
  -- If neither is present (shouldn't happen), link is not committed
  RETURN false;
END;
$$;

COMMENT ON FUNCTION is_link_cost_report_committed IS 'Returns true if the link is committed. For clarification links (only one party), only that party needs to be committed. For regular links (both parties), both must be committed';

-- ============================================================================
-- 4. STRICT UPDATE/DELETE POLICIES - ADD COMMIT RESTRICTIONS
-- ============================================================================
-- Policies are now much cleaner using helper functions for workspace checks
-- ============================================================================

-- For report table: Recreate update policy with commit check
DROP POLICY IF EXISTS "update anything from your workspace" ON "report";
CREATE POLICY "update anything from your workspace" ON "report"
FOR UPDATE
USING (
  report_belongs_to_user_workspace(report.id)
  AND NOT report.is_committed
)
WITH CHECK (true);

-- For report table: Recreate delete policy with commit check
DROP POLICY IF EXISTS "allow delete from your workspace" ON "report";
CREATE POLICY "allow delete from your workspace" ON "report"
FOR DELETE
USING (
  report_belongs_to_user_workspace(report.id)
  AND NOT report.is_committed
);

-- For billing table: Add new restrictive policies for committed items
CREATE POLICY "prevent_committed_billing_update" ON "billing"
FOR UPDATE
USING (
  billing_belongs_to_user_workspace(billing.id)
  AND NOT billing.is_committed
)
WITH CHECK (true);

CREATE POLICY "prevent_committed_billing_delete" ON "billing"
FOR DELETE
USING (
  billing_belongs_to_user_workspace(billing.id)
  AND NOT billing.is_committed
);

-- For cost table: Recreate update policy with commit check
DROP POLICY IF EXISTS "anyone within workspace can edit" ON "cost";
CREATE POLICY "anyone within workspace can edit" ON "cost"
FOR UPDATE
USING (
  cost_belongs_to_user_workspace(cost.id)
  AND NOT cost.is_committed
)
WITH CHECK (true);

-- For cost table: Recreate delete policy with commit check
DROP POLICY IF EXISTS "delete from your workspace" ON "cost";
CREATE POLICY "delete from your workspace" ON "cost"
FOR DELETE
USING (
  cost_belongs_to_user_workspace(cost.id)
  AND NOT cost.is_committed
);

-- For link_billing_report table: Recreate update policy with commit check
DROP POLICY IF EXISTS "update from within workspace" ON "link_billing_report";
CREATE POLICY "update from within workspace" ON "link_billing_report"
FOR UPDATE
USING (
  link_billing_report_belongs_to_user_workspace(link_billing_report.id)
  AND NOT is_link_billing_report_committed(link_billing_report.id)
)
WITH CHECK (true);

-- For link_billing_report table: Recreate delete policy with commit check
DROP POLICY IF EXISTS "delete billing links" ON "link_billing_report";
CREATE POLICY "delete billing links" ON "link_billing_report"
FOR DELETE
USING (
  link_billing_report_belongs_to_user_workspace(link_billing_report.id)
  AND NOT is_link_billing_report_committed(link_billing_report.id)
);

-- For link_cost_report table: Recreate update policy with commit check
DROP POLICY IF EXISTS "update withing worksapce" ON "link_cost_report";
CREATE POLICY "update withing worksapce" ON "link_cost_report"
FOR UPDATE
USING (
  link_cost_report_belongs_to_user_workspace(link_cost_report.id)
  AND NOT is_link_cost_report_committed(link_cost_report.id)
)
WITH CHECK (true);

-- For link_cost_report table: Recreate delete policy with commit check
DROP POLICY IF EXISTS "allow delete anything from your workspace" ON "link_cost_report";
CREATE POLICY "allow delete anything from your workspace" ON "link_cost_report"
FOR DELETE
USING (
  link_cost_report_belongs_to_user_workspace(link_cost_report.id)
  AND NOT is_link_cost_report_committed(link_cost_report.id)
);

-- ============================================================================
-- 5. RPC FUNCTIONS TO COMMIT/UNDO
-- ============================================================================

-- Generic function to set committed status for any table
CREATE OR REPLACE FUNCTION set_committed(
  p_table text,
  p_id bigint,
  p_value boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_check_function text;
  v_has_access boolean;
BEGIN
  -- Map table names to their workspace check functions
  CASE p_table
    WHEN 'report' THEN
      v_check_function := 'report_belongs_to_user_workspace';
    WHEN 'billing' THEN
      v_check_function := 'billing_belongs_to_user_workspace';
    WHEN 'cost' THEN
      v_check_function := 'cost_belongs_to_user_workspace';
    ELSE
      RAISE EXCEPTION 'Invalid table name: %. Allowed values: report, billing, cost', p_table;
  END CASE;
  
  -- Check workspace access using dynamic SQL
  EXECUTE format('SELECT %I($1)', v_check_function)
  USING p_id
  INTO v_has_access;
  
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied: % % not found or not accessible', p_table, p_id;
  END IF;
  
  -- Update the table
  EXECUTE format(
    'UPDATE %I SET is_committed = $1 WHERE id = $2',
    p_table
  )
  USING p_value, p_id;
END;
$$;

COMMENT ON FUNCTION set_committed IS 'Sets the committed status for a report, billing, or cost. Validates workspace access before updating.';

-- Convenience functions for commit/undo operations
CREATE OR REPLACE FUNCTION commit_report(p_report_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_committed('report', p_report_id, true);
END;
$$;

COMMENT ON FUNCTION commit_report IS 'Commits a report, preventing future updates and deletes';

CREATE OR REPLACE FUNCTION undo_commit_report(p_report_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_committed('report', p_report_id, false);
END;
$$;

COMMENT ON FUNCTION undo_commit_report IS 'Uncommits a report, allowing future updates and deletes';

CREATE OR REPLACE FUNCTION commit_billing(p_billing_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_committed('billing', p_billing_id, true);
END;
$$;

COMMENT ON FUNCTION commit_billing IS 'Commits a billing, preventing future updates and deletes';

CREATE OR REPLACE FUNCTION undo_commit_billing(p_billing_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_committed('billing', p_billing_id, false);
END;
$$;

COMMENT ON FUNCTION undo_commit_billing IS 'Uncommits a billing, allowing future updates and deletes';

CREATE OR REPLACE FUNCTION commit_cost(p_cost_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_committed('cost', p_cost_id, true);
END;
$$;

COMMENT ON FUNCTION commit_cost IS 'Commits a cost, preventing future updates and deletes';

CREATE OR REPLACE FUNCTION undo_commit_cost(p_cost_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_committed('cost', p_cost_id, false);
END;
$$;

COMMENT ON FUNCTION undo_commit_cost IS 'Uncommits a cost, allowing future updates and deletes';

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions for commit/undo functions
GRANT EXECUTE ON FUNCTION set_committed(text, bigint, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION commit_report(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION undo_commit_report(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION commit_billing(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION undo_commit_billing(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION commit_cost(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION undo_commit_cost(bigint) TO authenticated;

-- Grant permissions for commit check functions
GRANT EXECUTE ON FUNCTION is_link_billing_report_committed(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION is_link_cost_report_committed(bigint) TO authenticated;

-- Grant permissions for workspace check functions
GRANT EXECUTE ON FUNCTION user_belongs_to_workspace(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION report_belongs_to_user_workspace(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION billing_belongs_to_user_workspace(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION cost_belongs_to_user_workspace(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION link_billing_report_belongs_to_user_workspace(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION link_cost_report_belongs_to_user_workspace(bigint) TO authenticated;
