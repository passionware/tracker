-- Workspace visibility: hidden workspaces are omitted from selector lists (app applies filter).
ALTER TABLE workspace
ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN workspace.hidden IS
  'When true, workspace is omitted from switchers and pickers; rows remain readable/updatable for members.';
