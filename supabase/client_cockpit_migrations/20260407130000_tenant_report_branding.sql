-- Tenant branding: legacy cleanup, dual logos (issuer vs client), issuer display name, no per-tenant portal URL.
ALTER TABLE tenants
DROP COLUMN IF EXISTS report_brand_display_name;

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS workspace_logo_url text;

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS client_logo_url text;

UPDATE tenants
SET client_logo_url = logo_url
WHERE client_logo_url IS NULL
  AND logo_url IS NOT NULL;

COMMENT ON COLUMN tenants.workspace_logo_url IS
  'Report issuer / agency logo (PDF cover, email workspace slot)';

COMMENT ON COLUMN tenants.client_logo_url IS
  'Client organization logo (cockpit chrome, email client slot)';

ALTER TABLE tenants
DROP COLUMN IF EXISTS logo_url;

ALTER TABLE tenants
DROP COLUMN IF EXISTS report_portal_base_url;

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS workspace_name text;

COMMENT ON COLUMN tenants.workspace_name IS
  'Report issuer display name (left column in emails, PDF subtitle company line)';
