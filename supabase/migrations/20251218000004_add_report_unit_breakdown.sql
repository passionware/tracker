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

-- Update report_with_details view to include breakdown fields
DROP VIEW IF EXISTS report_with_details;
CREATE VIEW report_with_details AS
SELECT
    report.id,
    report.created_at,
    report.contractor_id,
    report.description,
    report.net_value,
    report.period_start,
    report.period_end,
    report.currency,
    report.client_id,
    report.workspace_id,
    report.project_iteration_id,
    report.d_unit,
    report.d_quantity,
    report.d_unit_price,
    COALESCE(jsonb_agg(DISTINCT jsonb_build_object('link', row_to_json(link_billing_report.*), 'billing', row_to_json(billing.*))) FILTER (WHERE link_billing_report.id IS NOT NULL), '[]'::jsonb) AS link_billing_reports,
    COALESCE(jsonb_agg(DISTINCT jsonb_build_object('link', row_to_json(link_cost_report.*), 'cost', row_to_json(cost.*))) FILTER (WHERE link_cost_report.id IS NOT NULL), '[]'::jsonb) AS link_cost_reports,
    round(COALESCE(sum(DISTINCT link_billing_report.billing_amount) FILTER (WHERE link_billing_report.report_id = report.id)::numeric, 0::numeric), 2) AS total_billing_billing_value,
    round(COALESCE(sum(DISTINCT link_cost_report.report_amount) FILTER (WHERE link_cost_report.report_id = report.id)::numeric, 0::numeric), 2) AS total_cost_cost_value,
    round((report.net_value::numeric - COALESCE(sum(DISTINCT link_billing_report.report_amount) FILTER (WHERE link_billing_report.report_id = report.id)::numeric, 0::numeric)), 2) AS report_billing_balance,
    round((report.net_value::numeric - COALESCE(sum(DISTINCT link_cost_report.report_amount) FILTER (WHERE link_cost_report.report_id = report.id)::numeric, 0::numeric)), 2) AS report_cost_balance,
    round((COALESCE(sum(DISTINCT link_billing_report.report_amount) FILTER (WHERE link_billing_report.report_id = report.id)::numeric, 0::numeric) - COALESCE(sum(DISTINCT link_cost_report.report_amount) FILTER (WHERE link_cost_report.report_id = report.id)::numeric, 0::numeric)), 2) AS billing_cost_balance,
    round((LEAST(COALESCE(sum(DISTINCT link_billing_report.report_amount) FILTER (WHERE link_billing_report.report_id = report.id AND link_billing_report.billing_id IS NOT NULL)::numeric, 0::numeric), report.net_value::numeric) - COALESCE(sum(DISTINCT link_cost_report.report_amount) FILTER (WHERE link_cost_report.report_id = report.id)::numeric, 0::numeric)), 2) AS immediate_payment_due,
    (SELECT row_to_json(previous_report.*)
     FROM report previous_report
     WHERE previous_report.contractor_id = report.contractor_id
       AND previous_report.client_id = report.client_id
       AND previous_report.workspace_id = report.workspace_id
       AND previous_report.period_end <= report.period_end
       AND previous_report.id <> report.id
     ORDER BY previous_report.period_end DESC
     LIMIT 1) AS previous_report
FROM report
LEFT JOIN link_billing_report ON report.id = link_billing_report.report_id
LEFT JOIN billing ON link_billing_report.billing_id = billing.id
LEFT JOIN link_cost_report ON report.id = link_cost_report.report_id
LEFT JOIN cost ON link_cost_report.cost_id = cost.id
GROUP BY report.id;