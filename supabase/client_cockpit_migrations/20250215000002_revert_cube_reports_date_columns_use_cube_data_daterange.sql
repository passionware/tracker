-- ============================================================================
-- REVERT: Use cube_data.dateRange instead of separate DB columns
-- ============================================================================
-- Report time range is stored in cube_reports.cube_data.dateRange (JSONB),
-- so start_date/end_date columns are redundant.

ALTER TABLE cube_reports
DROP COLUMN IF EXISTS start_date,
DROP COLUMN IF EXISTS end_date;

-- Remove 9-argument overload and restore original 7-argument function
DROP FUNCTION IF EXISTS secure_insert_cube_report(uuid, uuid, integer, text, jsonb, jsonb, text, date, date);

CREATE OR REPLACE FUNCTION secure_insert_cube_report(
  p_tenant_id uuid,
  p_user_id uuid,
  p_client_id integer,
  p_name text,
  p_cube_data jsonb,
  p_cube_config jsonb,
  p_description text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_tenant_client_id integer;
  v_report_id uuid;
BEGIN
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

  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'User % does not belong to tenant %', p_user_id, p_tenant_id;
  END IF;

  INSERT INTO cube_reports (
    tenant_id,
    created_by,
    name,
    description,
    cube_data,
    cube_config
  ) VALUES (
    p_tenant_id,
    p_user_id,
    p_name,
    p_description,
    p_cube_data,
    p_cube_config
  ) RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

COMMENT ON FUNCTION secure_insert_cube_report IS 'Securely inserts cube reports with client_id validation at database level';
