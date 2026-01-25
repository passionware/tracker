-- ============================================================================
-- ADD IS_PUBLISHED COLUMN TO CUBE_REPORTS
-- ============================================================================
-- Adds is_published column with default false to cube_reports table
-- Updates RLS policy to allow access if is_published=true OR user is admin

-- Add is_published column
ALTER TABLE cube_reports
ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN cube_reports.is_published IS 'Whether the report is published and visible to all tenant users (false = only admins can see)';

-- Set all existing reports to published (backward compatibility)
UPDATE cube_reports
SET is_published = true
WHERE is_published = false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS cube_reports_is_published_idx ON cube_reports(is_published);

-- ============================================================================
-- UPDATE RLS POLICY FOR CUBE_REPORTS SELECT
-- ============================================================================
-- Drop the existing policy
DROP POLICY IF EXISTS "cube_report_read_tenant_isolation" ON cube_reports;

-- Create new policy that allows access if:
-- 1. Report is published (is_published = true) AND user belongs to the tenant, OR
-- 2. User is admin (can see all reports in their tenant regardless of is_published)
CREATE POLICY "cube_report_read_tenant_isolation" ON cube_reports
  FOR SELECT USING (
    tenant_id = current_user_tenant_id()
    AND (
      is_published = true
      OR is_admin_user()
    )
  );

COMMENT ON POLICY "cube_report_read_tenant_isolation" ON cube_reports IS 
  'Users can see reports if: (1) report is published AND user belongs to tenant, OR (2) user is admin';
