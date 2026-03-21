-- Link an existing client to a workspace (caller must be a member of that workspace).

CREATE OR REPLACE FUNCTION link_client_to_workspace(
  p_workspace_id bigint,
  p_client_id bigint
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM link_workspace_user lwu
    WHERE lwu.workspace_id = p_workspace_id AND lwu.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'link_client_to_workspace: workspace not allowed for current user';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM client WHERE id = p_client_id) THEN
    RAISE EXCEPTION 'link_client_to_workspace: client not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM link_workspace_client lwc
    WHERE lwc.workspace_id = p_workspace_id AND lwc.client_id = p_client_id
  ) THEN
    RETURN;
  END IF;

  INSERT INTO link_workspace_client (workspace_id, client_id)
  VALUES (p_workspace_id, p_client_id);
END;
$$;

GRANT EXECUTE ON FUNCTION link_client_to_workspace(bigint, bigint) TO authenticated;

COMMENT ON FUNCTION link_client_to_workspace IS 'Adds a workspace–client link when the caller belongs to that workspace; no-op if the link already exists.';
