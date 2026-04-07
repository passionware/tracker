-- Billing: optional payment due date (distinct from invoice_date)
ALTER TABLE billing
ADD COLUMN IF NOT EXISTS due_date date;

COMMENT ON COLUMN billing.due_date IS 'Payment due date for the invoice';

-- Project: default offset (days after iteration end) for new reconciliation billings
ALTER TABLE project
ADD COLUMN IF NOT EXISTS default_billing_due_days integer NOT NULL DEFAULT 14;

COMMENT ON COLUMN project.default_billing_due_days IS
  'Days after project iteration period end used as default billing due date in reconciliation';

ALTER TABLE project
ADD COLUMN IF NOT EXISTS email_reply_invite_message text;

COMMENT ON COLUMN project.email_reply_invite_message IS
  'Optional closing paragraph for cockpit invoice + reminder emails (full block); embedded in published cube meta';

ALTER TABLE workspace
DROP COLUMN IF EXISTS report_brand_display_name;

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
    "billing"."due_date",
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

-- New parameters change the signature; DROP legacy overloads so GRANT and RPC stay unambiguous.
DROP FUNCTION IF EXISTS edit_project_with_workspaces(bigint, text, text, bigint, text, bigint[]);
DROP FUNCTION IF EXISTS create_project_with_workspaces(text, text, bigint, text, bigint[]);

CREATE OR REPLACE FUNCTION edit_project_with_workspaces(
  p_project_id bigint,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_client_id bigint DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_workspace_ids bigint[] DEFAULT NULL,
  p_default_billing_due_days integer DEFAULT NULL,
  p_email_reply_invite_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE project
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    client_id = COALESCE(p_client_id, client_id),
    status = COALESCE(p_status::project_status, status),
    default_billing_due_days = COALESCE(p_default_billing_due_days, default_billing_due_days),
    email_reply_invite_message = CASE
      WHEN p_email_reply_invite_message IS NULL THEN email_reply_invite_message
      ELSE NULLIF(BTRIM(p_email_reply_invite_message), '')
    END
  WHERE id = p_project_id;

  IF p_workspace_ids IS NOT NULL THEN
    DELETE FROM link_project_workspace
    WHERE project_id = p_project_id
      AND NOT (workspace_id = ANY (p_workspace_ids));

    IF array_length(p_workspace_ids, 1) > 0 THEN
      INSERT INTO link_project_workspace (project_id, workspace_id, is_primary)
      SELECT
        p_project_id,
        workspace_id,
        row_number() OVER (ORDER BY ordinal) = 1
      FROM unnest(p_workspace_ids) WITH ORDINALITY AS t(workspace_id, ordinal)
      WHERE NOT EXISTS (
        SELECT 1 FROM link_project_workspace lpw
        WHERE lpw.project_id = p_project_id
          AND lpw.workspace_id = t.workspace_id
      );
    END IF;

    UPDATE link_project_workspace
    SET is_primary = false
    WHERE project_id = p_project_id;

    IF array_length(p_workspace_ids, 1) > 0 THEN
      UPDATE link_project_workspace
      SET is_primary = true
      WHERE project_id = p_project_id
        AND workspace_id = p_workspace_ids[1];
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION create_project_with_workspaces(
  p_name text,
  p_description text,
  p_client_id bigint,
  p_status text,
  p_workspace_ids bigint[],
  p_default_billing_due_days integer DEFAULT NULL,
  p_email_reply_invite_message text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_id bigint;
BEGIN
  INSERT INTO project (
    name,
    description,
    client_id,
    status,
    default_billing_due_days,
    email_reply_invite_message
  )
  VALUES (
    p_name,
    p_description,
    p_client_id,
    p_status::project_status,
    COALESCE(p_default_billing_due_days, 14),
    NULLIF(BTRIM(COALESCE(p_email_reply_invite_message, '')), '')
  )
  RETURNING id INTO v_project_id;

  IF array_length(p_workspace_ids, 1) > 0 THEN
    INSERT INTO link_project_workspace (project_id, workspace_id, is_primary)
    SELECT
      v_project_id,
      t.workspace_id,
      t.ordinal = 1
    FROM unnest(p_workspace_ids) WITH ORDINALITY AS t(workspace_id, ordinal);
  END IF;

  RETURN v_project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION edit_project_with_workspaces(bigint, text, text, bigint, text, bigint[], integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION edit_project_with_workspaces(bigint, text, text, bigint, text, bigint[], integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION create_project_with_workspaces(text, text, bigint, text, bigint[], integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_project_with_workspaces(text, text, bigint, text, bigint[], integer, text) TO service_role;
