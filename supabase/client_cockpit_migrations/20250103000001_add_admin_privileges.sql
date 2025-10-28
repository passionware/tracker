-- ============================================================================
-- ADMIN PRIVILEGES MIGRATION - GLOBAL ADMIN ACCESS
-- ============================================================================
-- Adds global admin policies to all tables. RLS uses OR logic - if ANY policy passes, operation is allowed.
-- Existing tenant policies remain unchanged, admin policies are added alongside them.


-- ============================================================================
-- 1. ADMIN CHECK FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM users WHERE id = auth.uid() LIMIT 1;
  RETURN COALESCE(user_role = 'admin', false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 2. HELPER FUNCTION FOR ADMIN POLICIES
-- ============================================================================
-- Add admin policies to any table
CREATE OR REPLACE FUNCTION add_admin_policies_to_table(table_name text)
RETURNS void AS $$
BEGIN
  EXECUTE format('CREATE POLICY "global_admin_select" ON %I FOR SELECT USING (is_admin_user())', table_name);
  EXECUTE format('CREATE POLICY "global_admin_insert" ON %I FOR INSERT WITH CHECK (is_admin_user())', table_name);
  EXECUTE format('CREATE POLICY "global_admin_update" ON %I FOR UPDATE USING (is_admin_user()) WITH CHECK (is_admin_user())', table_name);
  EXECUTE format('CREATE POLICY "global_admin_delete" ON %I FOR DELETE USING (is_admin_user())', table_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. APPLY ADMIN POLICIES TO EXISTING TABLES
-- ============================================================================
SELECT add_admin_policies_to_table('tenants');
SELECT add_admin_policies_to_table('users');
SELECT add_admin_policies_to_table('cube_reports');
SELECT add_admin_policies_to_table('report_access_logs');
