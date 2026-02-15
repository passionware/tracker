-- ============================================================================
-- ADD EXPLICIT START_DATE / END_DATE TO CUBE_REPORTS
-- ============================================================================
-- Report time range is stored explicitly (e.g. from project iteration period)
-- instead of being derived from time entries, which can shift when there's
-- no work on the range start day.

ALTER TABLE cube_reports
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date;

COMMENT ON COLUMN cube_reports.start_date IS 'Explicit report period start (e.g. from project iteration); used for display and filtering';
COMMENT ON COLUMN cube_reports.end_date IS 'Explicit report period end (e.g. from project iteration); used for display and filtering';

-- ============================================================================
-- UPDATE SECURE INSERT FUNCTION TO ACCEPT START_DATE / END_DATE
-- ============================================================================
-- Drop the old 7-argument overload so the new 9-argument version is the only one
DROP FUNCTION IF EXISTS secure_insert_cube_report(uuid, uuid, integer, text, jsonb, jsonb, text);

CREATE OR REPLACE FUNCTION secure_insert_cube_report(
  p_tenant_id uuid,
  p_user_id uuid,
  p_client_id integer,
  p_name text,
  p_cube_data jsonb,
  p_cube_config jsonb,
  p_description text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_tenant_client_id integer;
  v_report_id uuid;
BEGIN
  -- SECURITY: Validate that the provided client_id matches the tenant's client_id
  SELECT client_id INTO v_tenant_client_id
  FROM tenants
  WHERE id = p_tenant_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant not found: %', p_tenant_id;
  END IF;
  
  IF v_tenant_client_id != p_client_id THEN
    RAISE EXCEPTION 'Client ID mismatch: provided=%, tenant_client_id=%. Cross-client access denied.', 
      p_client_id, v_tenant_client_id;
  END IF;
  
  -- SECURITY: Validate that the user belongs to this tenant
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = p_user_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'User % does not belong to tenant %', p_user_id, p_tenant_id;
  END IF;
  
  -- Insert the report
  INSERT INTO cube_reports (
    tenant_id,
    created_by,
    name,
    description,
    cube_data,
    cube_config,
    start_date,
    end_date
  ) VALUES (
    p_tenant_id,
    p_user_id,
    p_name,
    p_description,
    p_cube_data,
    p_cube_config,
    p_start_date,
    p_end_date
  ) RETURNING id INTO v_report_id;
  
  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

COMMENT ON FUNCTION secure_insert_cube_report IS 'Securely inserts cube reports with client_id validation; start_date/end_date set from e.g. project iteration period';
