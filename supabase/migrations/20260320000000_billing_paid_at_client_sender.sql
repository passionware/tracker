-- Paid date / justification on billings (client payment tracking)
ALTER TABLE billing
ADD COLUMN IF NOT EXISTS "paid_at" date,
ADD COLUMN IF NOT EXISTS "paid_at_justification" text;

COMMENT ON COLUMN billing.paid_at IS 'Date the client paid this invoice (bank/settlement date)';
COMMENT ON COLUMN billing.paid_at_justification IS 'Free-text note on payment (e.g. wrong amount, installments)';

-- Optional bank sender hints for AI CSV matching
ALTER TABLE client
ADD COLUMN IF NOT EXISTS "sender_name" text;

COMMENT ON COLUMN client.sender_name IS 'Expected bank transfer sender name / alias for this client (optional, for payment matching)';

DROP VIEW IF EXISTS billing_with_details;
CREATE VIEW billing_with_details AS
 SELECT "billing"."id",
    "billing"."created_at",
    "billing"."currency",
    "billing"."total_net",
    "billing"."total_gross",
    "billing"."client_id",
    "billing"."invoice_number",
    "billing"."invoice_date",
    "billing"."description",
    "billing"."workspace_id",
    "billing"."is_committed",
    "billing"."paid_at",
    "billing"."paid_at_justification",
    COALESCE("jsonb_agg"(DISTINCT "jsonb_build_object"('link', "row_to_json"("link_billing_report".*), 'report', "row_to_json"("report".*))) FILTER (WHERE ("link_billing_report"."id" IS NOT NULL)), '[]'::"jsonb") AS "link_billing_reports",
    COALESCE("jsonb_agg"(DISTINCT "jsonb_build_object"('contractor', "row_to_json"("contractor".*))) FILTER (WHERE ("contractor"."id" IS NOT NULL)), '[]'::"jsonb") AS "contractors",
    COALESCE("array_agg"(DISTINCT "contractor"."id") FILTER (WHERE ("contractor"."id" IS NOT NULL)), ARRAY[]::bigint[]) AS "linked_contractor_ids",
    "row_to_json"("client".*) AS "client",
    "round"(COALESCE(("sum"("link_billing_report"."report_amount") FILTER (WHERE ("link_billing_report"."billing_id" = "billing"."id")))::numeric, (0)::numeric), 2) AS "total_report_value",
    "round"(COALESCE(("sum"("link_billing_report"."billing_amount") FILTER (WHERE ("link_billing_report"."billing_id" = "billing"."id")))::numeric, (0)::numeric), 2) AS "total_billing_value",
    "round"((COALESCE(("sum"("link_billing_report"."billing_amount") FILTER (WHERE ("link_billing_report"."billing_id" = "billing"."id")))::numeric, (0)::numeric) - COALESCE(("sum"("link_billing_report"."report_amount") FILTER (WHERE ("link_billing_report"."billing_id" = "billing"."id")))::numeric, (0)::numeric)), 2) AS "billing_balance",
    "round"((("billing"."total_net")::numeric - COALESCE(("sum"("link_billing_report"."billing_amount") FILTER (WHERE ("link_billing_report"."billing_id" = "billing"."id")))::numeric, (0)::numeric)), 2) AS "remaining_balance"
   FROM (((("billing"
     LEFT JOIN "link_billing_report" ON (("billing"."id" = "link_billing_report"."billing_id")))
     LEFT JOIN "report" ON (("link_billing_report"."report_id" = "report"."id")))
     LEFT JOIN "contractor" ON (("report"."contractor_id" = "contractor"."id")))
     LEFT JOIN "client" ON (("billing"."client_id" = "client"."id")))
  GROUP BY "billing"."id", "client"."id";
