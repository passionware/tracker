-- ============================================================================
-- CLIENT COCKPIT SCHEMA
-- Multi-tenant data isolation with strict RLS policies
-- ============================================================================

-- Set search path to ensure all objects are created in the correct schema
SET search_path = client_cockpit_dev;

-- IMPORTANT: Supabase Auth Users
-- Supabase maintains the `auth.users` table automatically.
-- We DO NOT create or modify it directly.
-- It contains: id, email, password_hash, created_at, etc.
--
-- Our `users` table is a COMPANION table that:
-- 1. References auth.users by ID (FK relationship)
-- 2. Stores app-specific metadata (tenant_id, role)
-- 3. Enables RLS policies to work with multi-tenant isolation

-- 1. TENANTS TABLE
-- Represents a client's tenant within the client cockpit
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE,  -- References your main client DB
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE tenants IS 'Client cockpit tenants - each represents a distinct client';
COMMENT ON COLUMN tenants.client_id IS 'Reference to the main application client';
COMMENT ON COLUMN tenants.id IS 'UUID - non-guessable identifier for URL routing';

-- 2. USERS TABLE
-- Companion table to Supabase's auth.users with tenant-specific metadata
--
-- auth.users (Supabase managed):
--   id, email, password_hash, created_at, ...
--
-- users (our table):
--   id (FK to auth.users), tenant_id (RLS boundary), role, ...
--
-- This pattern is standard for multi-tenant Supabase apps.
-- We store tenant_id here so RLS policies can check it.
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer',  -- 'admin', 'editor', 'viewer'
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT valid_role CHECK (role IN ('admin', 'editor', 'viewer'))
);

COMMENT ON TABLE users IS 'Companion to auth.users - stores tenant assignments and roles';
COMMENT ON COLUMN users.id IS 'References auth.users(id) - Supabase Auth manages the actual user';
COMMENT ON COLUMN users.tenant_id IS 'Tenant assignment - CRITICAL for RLS policies';
COMMENT ON COLUMN users.role IS 'Role-based permissions: admin, editor, viewer';

CREATE INDEX users_tenant_id_idx ON users(tenant_id);

-- 3. CUBE REPORTS TABLE
-- Exported cube data shared with tenants
CREATE TABLE IF NOT EXISTS cube_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  cube_data jsonb NOT NULL,  -- The actual serialized cube with data
  cube_config jsonb NOT NULL,  -- Metadata: dimensions, measures, etc
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE cube_reports IS 'Cube reports/exports shared with tenants - STRICT tenant isolation';
COMMENT ON COLUMN cube_reports.cube_data IS 'Serialized cube with actual data (from ExportBuilderPage)';
COMMENT ON COLUMN cube_reports.cube_config IS 'Configuration: selected dimensions, measures, filters';

CREATE INDEX cube_reports_tenant_id_idx ON cube_reports(tenant_id);
CREATE INDEX cube_reports_created_by_idx ON cube_reports(created_by);

-- 4. REPORT ACCESS LOGS (optional but recommended for compliance)
CREATE TABLE IF NOT EXISTS report_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  report_id uuid NOT NULL REFERENCES cube_reports(id),
  accessed_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE report_access_logs IS 'Audit trail of report accesses for compliance';
CREATE INDEX report_access_logs_tenant_id_idx ON report_access_logs(tenant_id);
CREATE INDEX report_access_logs_user_id_idx ON report_access_logs(user_id);

-- ============================================================================
-- RLS POLICIES - MULTI-TENANT ISOLATION
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cube_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_access_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTION: Get current user's tenant_id
-- ============================================================================
CREATE OR REPLACE FUNCTION current_user_tenant_id()
RETURNS uuid AS $$
  SELECT tenant_id FROM users 
  WHERE id = auth.uid()
  LIMIT 1
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION current_user_tenant_id() IS 'Returns the tenant_id of the current authenticated user';

-- ============================================================================
-- TENANT POLICIES
-- ============================================================================
CREATE POLICY "tenant_user_can_read_own_tenant" ON tenants
  FOR SELECT USING (id = current_user_tenant_id());

CREATE POLICY "tenant_user_cannot_modify" ON tenants
  FOR INSERT WITH CHECK (false);

CREATE POLICY "tenant_user_cannot_update" ON tenants
  FOR UPDATE USING (false);

CREATE POLICY "tenant_user_cannot_delete" ON tenants
  FOR DELETE USING (false);

-- ============================================================================
-- USER POLICIES - Strict isolation by tenant
-- ============================================================================

-- SELECT: Can only see users in their own tenant
CREATE POLICY "user_can_read_tenant_members" ON users
  FOR SELECT USING (
    tenant_id = current_user_tenant_id()
  );

-- INSERT: Blocked at application level (admin only)
CREATE POLICY "user_cannot_insert" ON users
  FOR INSERT WITH CHECK (false);

-- UPDATE: Users can only update their own profile
CREATE POLICY "user_can_update_own_profile" ON users
  FOR UPDATE USING (
    id = auth.uid()
    AND tenant_id = current_user_tenant_id()
  )
  WITH CHECK (
    id = auth.uid()
    AND tenant_id = current_user_tenant_id()
  );

-- DELETE: Blocked at application level
CREATE POLICY "user_cannot_delete" ON users
  FOR DELETE USING (false);

-- ============================================================================
-- CUBE REPORT POLICIES - Multi-layer security
-- ============================================================================

-- SELECT: Must be in the same tenant
CREATE POLICY "cube_report_read_tenant_isolation" ON cube_reports
  FOR SELECT USING (
    tenant_id = current_user_tenant_id()
  );

-- INSERT: Must assign to own tenant and own user_id
CREATE POLICY "cube_report_insert_own_tenant" ON cube_reports
  FOR INSERT WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND created_by = auth.uid()
  );

-- UPDATE: Owner can update their own reports
CREATE POLICY "cube_report_update_own" ON cube_reports
  FOR UPDATE USING (
    tenant_id = current_user_tenant_id()
    AND created_by = auth.uid()
  )
  WITH CHECK (
    -- SECURITY: tenant_id and created_by MUST NOT change
    -- These are immutable once created
    tenant_id = current_user_tenant_id()
    AND created_by = auth.uid()
  );

-- DELETE: Owner can delete their own reports
CREATE POLICY "cube_report_delete_own" ON cube_reports
  FOR DELETE USING (
    tenant_id = current_user_tenant_id()
    AND created_by = auth.uid()
  );

-- ============================================================================
-- ACCESS LOG POLICIES - Automatic tenant assignment
-- ============================================================================

CREATE POLICY "access_log_read_own_tenant" ON report_access_logs
  FOR SELECT USING (
    tenant_id = current_user_tenant_id()
  );

-- Only allow inserts (automatic logging, cannot modify)
CREATE POLICY "access_log_insert_own_tenant" ON report_access_logs
  FOR INSERT WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND user_id = auth.uid()
  );

-- ============================================================================
-- TRIGGERS - Automatically maintain updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_update_timestamp
BEFORE UPDATE ON tenants
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER users_update_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER cube_reports_update_timestamp
BEFORE UPDATE ON cube_reports
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
-- 1. All tables have tenant_id as the primary security boundary
-- 2. RLS policies check both tenant_id AND user auth status
-- 3. Functions like current_user_tenant_id() are marked STABLE for performance
-- 4. auth.uid() is checked at database level, not application level
-- 5. This prevents ANY accidental data leakage
-- 
-- TO TEST RLS:
-- 1. Connect as different users
-- 2. Try to access records from other tenants
-- 3. Verify only own tenant data is visible
-- 4. Try direct SQL bypasses - they should fail with RLS violation
