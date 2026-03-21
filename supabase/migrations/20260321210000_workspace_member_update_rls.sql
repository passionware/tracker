-- Allow workspace members to update workspace profile fields (name, slug, avatar).
CREATE POLICY "workspace_member_update" ON workspace
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM link_workspace_user lwu
    WHERE lwu.workspace_id = workspace.id AND lwu.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM link_workspace_user lwu
    WHERE lwu.workspace_id = workspace.id AND lwu.user_id = auth.uid()
  )
);

COMMENT ON POLICY "workspace_member_update" ON workspace IS
  'Members (link_workspace_user) may update their workspace row; aligns with app workspace management UI.';
