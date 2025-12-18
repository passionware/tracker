-- Add enhanced breakdown fields to reports table (optional, backward compatible)
ALTER TABLE report
ADD COLUMN IF NOT EXISTS d_unit text,
ADD COLUMN IF NOT EXISTS d_quantity double precision,
ADD COLUMN IF NOT EXISTS d_unit_price double precision;

-- Add enhanced linking fields to link_billing_report table (optional, backward compatible)
ALTER TABLE link_billing_report
ADD COLUMN IF NOT EXISTS d_quantity double precision,
ADD COLUMN IF NOT EXISTS d_unit text,
ADD COLUMN IF NOT EXISTS d_report_unit_price double precision,
ADD COLUMN IF NOT EXISTS d_billing_unit_price double precision,
ADD COLUMN IF NOT EXISTS d_report_currency text,
ADD COLUMN IF NOT EXISTS d_billing_currency text;

-- Add enhanced linking fields to link_cost_report table (optional, backward compatible)
ALTER TABLE link_cost_report
ADD COLUMN IF NOT EXISTS d_quantity double precision,
ADD COLUMN IF NOT EXISTS d_unit text,
ADD COLUMN IF NOT EXISTS d_report_unit_price double precision,
ADD COLUMN IF NOT EXISTS d_cost_unit_price double precision,
ADD COLUMN IF NOT EXISTS d_exchange_rate double precision DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS d_report_currency text,
ADD COLUMN IF NOT EXISTS d_cost_currency text;

-- Add validation constraints for unit_price (must be non-negative when present)
ALTER TABLE report
ADD CONSTRAINT report_d_unit_price_check CHECK (d_unit_price IS NULL OR d_unit_price >= 0);

-- Add validation constraints for quantity (must be non-negative when present)
ALTER TABLE report
ADD CONSTRAINT report_d_quantity_check CHECK (d_quantity IS NULL OR d_quantity >= 0);

-- Add validation constraints for link quantities and prices (must be non-negative when present)
ALTER TABLE link_billing_report
ADD CONSTRAINT link_billing_report_d_quantity_check CHECK (d_quantity IS NULL OR d_quantity >= 0),
ADD CONSTRAINT link_billing_report_d_report_unit_price_check CHECK (d_report_unit_price IS NULL OR d_report_unit_price >= 0),
ADD CONSTRAINT link_billing_report_d_billing_unit_price_check CHECK (d_billing_unit_price IS NULL OR d_billing_unit_price >= 0);

ALTER TABLE link_cost_report
ADD CONSTRAINT link_cost_report_d_quantity_check CHECK (d_quantity IS NULL OR d_quantity >= 0),
ADD CONSTRAINT link_cost_report_d_report_unit_price_check CHECK (d_report_unit_price IS NULL OR d_report_unit_price >= 0),
ADD CONSTRAINT link_cost_report_d_cost_unit_price_check CHECK (d_cost_unit_price IS NULL OR d_cost_unit_price >= 0),
ADD CONSTRAINT link_cost_report_d_exchange_rate_check CHECK (d_exchange_rate IS NULL OR d_exchange_rate > 0);

-- Add comments for documentation
COMMENT ON COLUMN report.d_unit IS 'Unit type for enhanced breakdown display (e.g., "h", "d", "pc"). Optional - when present enables detailed UI.';
COMMENT ON COLUMN report.d_quantity IS 'Quantity for enhanced breakdown display (e.g., 50). Optional - when present with unit/unit_price enables detailed UI.';
COMMENT ON COLUMN report.d_unit_price IS 'Unit price for enhanced breakdown display (e.g., 100). Optional - when present with unit/quantity enables detailed UI.';

COMMENT ON COLUMN link_billing_report.d_quantity IS 'Linked quantity for enhanced display (e.g., 50 hours - same for both report and billing sides). Optional - when present enables detailed UI.';
COMMENT ON COLUMN link_billing_report.d_unit IS 'Unit type for the linked quantity (e.g., "h" for hours). Optional - when present enables detailed UI.';
COMMENT ON COLUMN link_billing_report.d_report_unit_price IS 'Unit price from the report side (e.g., 100 PLN/h). Optional - when present enables detailed UI.';
COMMENT ON COLUMN link_billing_report.d_billing_unit_price IS 'Unit price for the billing side (e.g., 35 EUR/h). Optional - when present enables detailed UI.';
COMMENT ON COLUMN link_billing_report.d_report_currency IS 'Report currency snapshot for audit trail (e.g., "pln"). Optional - protects against future report currency changes.';
COMMENT ON COLUMN link_billing_report.d_billing_currency IS 'Billing currency snapshot for audit trail (e.g., "eur"). Optional - protects against future billing currency changes.';

COMMENT ON COLUMN link_cost_report.d_quantity IS 'Linked quantity for enhanced display (e.g., 50 hours - same for both report and cost sides). Optional - when present enables detailed UI.';
COMMENT ON COLUMN link_cost_report.d_unit IS 'Unit type for the linked quantity (e.g., "h" for hours). Optional - when present enables detailed UI.';
COMMENT ON COLUMN link_cost_report.d_report_unit_price IS 'Unit price from the report side (e.g., 1000 EUR / 50 hours = 20 EUR/h). Optional - when present enables detailed UI.';
COMMENT ON COLUMN link_cost_report.d_cost_unit_price IS 'Actual cost per unit paid (e.g., 4000 PLN / 50 hours = 80 PLN/h). Optional - when present enables detailed UI.';
COMMENT ON COLUMN link_cost_report.d_exchange_rate IS 'Exchange rate used for currency conversion between reported and actual costs (default 1.0). Optional - when present enables currency conversion tracking.';
COMMENT ON COLUMN link_cost_report.d_report_currency IS 'Report currency snapshot for audit trail. Optional - protects against future report currency changes.';
COMMENT ON COLUMN link_cost_report.d_cost_currency IS 'Cost currency snapshot for audit trail. Optional - protects against future cost currency changes.';