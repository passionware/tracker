-- Report links use deployment origin; workspace no longer stores a portal base URL.
ALTER TABLE workspace
DROP COLUMN IF EXISTS report_portal_base_url;
