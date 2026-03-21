-- Client visibility: hidden clients are omitted from selector lists (app applies filter).
ALTER TABLE client
ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN client.hidden IS
  'When true, client is omitted from client switchers and pickers; rows remain readable/updatable for members.';
