-- ============================================================================
-- SECURE REPORT INSERT FUNCTION
-- ============================================================================
-- Creates a database-level function that validates client_id before inserting reports
-- This provides stronger security than API-level validation

-- ============================================================================
-- SECURE INSERT FUNCTION
-- ============================================================================
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
  -- SECURITY: Validate that the provided client_id matches the tenant's client_id
  SELECT client_id INTO v_tenant_client_id
  FROM client_cockpit_dev.tenants
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
    SELECT 1 FROM client_cockpit_dev.users 
    WHERE id = p_user_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'User % does not belong to tenant %', p_user_id, p_tenant_id;
  END IF;
  
  -- Insert the report
  INSERT INTO client_cockpit_dev.cube_reports (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION secure_insert_cube_report IS 'Securely inserts cube reports with client_id validation at database level';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION secure_insert_cube_report TO authenticated;
