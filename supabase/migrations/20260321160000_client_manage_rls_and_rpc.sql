-- Client management: update existing rows; create/remove via RPC (atomic link + correct visibility).

CREATE POLICY "update clients" ON client
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM link_workspace_client lwc
    JOIN link_workspace_user lwu ON lwc.workspace_id = lwu.workspace_id
    WHERE lwc.client_id = client.id AND lwu.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM link_workspace_client lwc
    JOIN link_workspace_user lwu ON lwc.workspace_id = lwu.workspace_id
    WHERE lwc.client_id = client.id AND lwu.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION create_client_for_workspace(
  p_workspace_id bigint,
  p_name text,
  p_avatar_url text,
  p_sender_name text
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM link_workspace_user lwu
    WHERE lwu.workspace_id = p_workspace_id AND lwu.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'create_client_for_workspace: workspace not allowed for current user';
  END IF;

  INSERT INTO client (name, avatar_url, sender_name)
  VALUES (p_name, p_avatar_url, NULLIF(trim(p_sender_name), ''))
  RETURNING id INTO new_id;

  INSERT INTO link_workspace_client (workspace_id, client_id)
  VALUES (p_workspace_id, new_id);

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION remove_client_from_workspace(
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
    RAISE EXCEPTION 'remove_client_from_workspace: workspace not allowed for current user';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM link_workspace_client lwc
    WHERE lwc.workspace_id = p_workspace_id AND lwc.client_id = p_client_id
  ) THEN
    RAISE EXCEPTION 'remove_client_from_workspace: client is not linked to this workspace';
  END IF;

  DELETE FROM link_workspace_client
  WHERE workspace_id = p_workspace_id AND client_id = p_client_id;

  IF NOT EXISTS (
    SELECT 1 FROM link_workspace_client lwc WHERE lwc.client_id = p_client_id
  ) THEN
    BEGIN
      DELETE FROM client WHERE id = p_client_id;
    EXCEPTION
      WHEN foreign_key_violation THEN
        NULL;
    END;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION create_client_for_workspace(bigint, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_client_from_workspace(bigint, bigint) TO authenticated;

COMMENT ON FUNCTION create_client_for_workspace IS 'Creates a client and links it to the given workspace (caller must be a member of that workspace).';
COMMENT ON FUNCTION remove_client_from_workspace IS 'Unlinks a client from a workspace; deletes the client row if no workspace links remain (fails if other data still references the client).';
