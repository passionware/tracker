-- Cockpit-related defaults as JSON (email copy, subject templates, …).
ALTER TABLE project
ADD COLUMN IF NOT EXISTS report_defaults jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN project.report_defaults IS
  'JSON defaults for published cockpit reports (e.g. email_reply_invite_message, invoice_email.title_template, reminder_email.title_template)';

-- Backfill from legacy text columns into report_defaults, then drop them.
UPDATE project
SET report_defaults = jsonb_strip_nulls(
  jsonb_build_object(
    'email_reply_invite_message',
    CASE
      WHEN nullif(btrim(email_reply_invite_message), '') IS NOT NULL
        THEN to_jsonb(btrim(email_reply_invite_message))
    END
  )
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'project'
      AND column_name = 'email_subject_template_invoice'
  ) THEN
    UPDATE project p
    SET report_defaults = p.report_defaults
      || jsonb_strip_nulls(
        jsonb_build_object(
          'invoice_email',
          CASE
            WHEN nullif(btrim(p.email_subject_template_invoice), '') IS NOT NULL
              THEN jsonb_build_object(
                'title_template',
                btrim(p.email_subject_template_invoice)
              )
          END,
          'reminder_email',
          CASE
            WHEN nullif(btrim(p.email_subject_template_reminder), '') IS NOT NULL
              THEN jsonb_build_object(
                'title_template',
                btrim(p.email_subject_template_reminder)
              )
          END
        )
      );
  END IF;
END
$$;

ALTER TABLE project DROP COLUMN IF EXISTS email_subject_template_invoice;
ALTER TABLE project DROP COLUMN IF EXISTS email_subject_template_reminder;
ALTER TABLE project DROP COLUMN IF EXISTS email_reply_invite_message;

DROP FUNCTION IF EXISTS edit_project_with_workspaces(bigint, text, text, bigint, text, bigint[], integer, text, text, text);
DROP FUNCTION IF EXISTS edit_project_with_workspaces(bigint, text, text, bigint, text, bigint[], integer, text);

CREATE OR REPLACE FUNCTION edit_project_with_workspaces(
  p_project_id bigint,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_client_id bigint DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_workspace_ids bigint[] DEFAULT NULL,
  p_default_billing_due_days integer DEFAULT NULL,
  p_report_defaults jsonb DEFAULT NULL
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
    report_defaults = CASE
      WHEN p_report_defaults IS NULL THEN report_defaults
      ELSE COALESCE(report_defaults, '{}'::jsonb) || p_report_defaults
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

DROP FUNCTION IF EXISTS create_project_with_workspaces(text, text, bigint, text, bigint[], integer, text, text, text);
DROP FUNCTION IF EXISTS create_project_with_workspaces(text, text, bigint, text, bigint[], integer, text);

CREATE OR REPLACE FUNCTION create_project_with_workspaces(
  p_name text,
  p_description text,
  p_client_id bigint,
  p_status text,
  p_workspace_ids bigint[],
  p_default_billing_due_days integer DEFAULT NULL,
  p_report_defaults jsonb DEFAULT NULL
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
    report_defaults
  )
  VALUES (
    p_name,
    p_description,
    p_client_id,
    p_status::project_status,
    COALESCE(p_default_billing_due_days, 14),
    COALESCE(p_report_defaults, '{}'::jsonb)
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

GRANT EXECUTE ON FUNCTION edit_project_with_workspaces(bigint, text, text, bigint, text, bigint[], integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION edit_project_with_workspaces(bigint, text, text, bigint, text, bigint[], integer, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION create_project_with_workspaces(text, text, bigint, text, bigint[], integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION create_project_with_workspaces(text, text, bigint, text, bigint[], integer, jsonb) TO service_role;
