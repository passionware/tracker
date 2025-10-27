-- Create function to edit project with workspace relationships in a single transaction
CREATE OR REPLACE FUNCTION edit_project_with_workspaces(
  p_project_id BIGINT,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_client_id BIGINT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_workspace_ids BIGINT[] DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_workspace_ids BIGINT[];
  current_primary_workspace_id BIGINT;
  new_primary_workspace_id BIGINT;
BEGIN
  -- Update project basic fields
  UPDATE project
  SET 
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    client_id = COALESCE(p_client_id, client_id),
    status = COALESCE(p_status::project_status, status)
  WHERE id = p_project_id;

  -- Handle workspace relationships if workspace_ids is provided
  IF p_workspace_ids IS NOT NULL THEN
    -- 1. Delete existing relationships that are not in the new list
    DELETE FROM link_project_workspace 
    WHERE project_id = p_project_id 
    AND workspace_id = ANY(p_workspace_ids) = FALSE;

    -- 2. Insert new relationships that don't already exist
    IF array_length(p_workspace_ids, 1) > 0 THEN
      INSERT INTO link_project_workspace (project_id, workspace_id, is_primary)
      SELECT 
        p_project_id,
        workspace_id,
        (row_number() OVER (ORDER BY ordinal)) = 1  -- First workspace is primary
      FROM unnest(p_workspace_ids) WITH ORDINALITY AS t(workspace_id, ordinal)
      WHERE NOT EXISTS (
        SELECT 1 FROM link_project_workspace 
        WHERE project_id = p_project_id 
        AND link_project_workspace.workspace_id = t.workspace_id
      );
    END IF;

    -- 3. Update primary workspace if needed
    -- Set the first workspace as primary and unset others
    UPDATE link_project_workspace 
    SET is_primary = FALSE 
    WHERE project_id = p_project_id;

    IF array_length(p_workspace_ids, 1) > 0 THEN
      UPDATE link_project_workspace 
      SET is_primary = TRUE 
      WHERE project_id = p_project_id 
      AND workspace_id = p_workspace_ids[1];
    END IF;
  END IF;
END;
$$;

-- Create function to create project with workspace relationships in a single transaction
CREATE OR REPLACE FUNCTION create_project_with_workspaces(
  p_name TEXT,
  p_description TEXT,
  p_client_id BIGINT,
  p_status TEXT,
  p_workspace_ids BIGINT[]
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_id BIGINT;
BEGIN
  -- Insert project
  INSERT INTO project (name, description, client_id, status)
  VALUES (p_name, p_description, p_client_id, p_status::project_status)
  RETURNING id INTO v_project_id;

  -- Create workspace relationships
  IF array_length(p_workspace_ids, 1) > 0 THEN
    INSERT INTO link_project_workspace (project_id, workspace_id, is_primary)
    SELECT 
      v_project_id,
      unnest(p_workspace_ids),
      (row_number() OVER ()) = 1  -- First workspace is primary
    FROM unnest(p_workspace_ids) WITH ORDINALITY AS t(workspace_id, ordinal);
  END IF;

  RETURN v_project_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION edit_project_with_workspaces TO authenticated;
GRANT EXECUTE ON FUNCTION edit_project_with_workspaces TO service_role;
GRANT EXECUTE ON FUNCTION create_project_with_workspaces TO authenticated;
GRANT EXECUTE ON FUNCTION create_project_with_workspaces TO service_role;
