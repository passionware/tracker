-- Cockpit email subject lines: optional Mustache-style templates per project, snapshotted in cube meta on publish.
ALTER TABLE project
ADD COLUMN IF NOT EXISTS email_subject_template_invoice text;

ALTER TABLE project
ADD COLUMN IF NOT EXISTS email_subject_template_reminder text;

COMMENT ON COLUMN project.email_subject_template_invoice IS
  'Optional invoice-email subject template ({{from}}, {{to}}, {{period}}, {{workspaceName}}, {{clientName}}); embedded in published cube meta';

COMMENT ON COLUMN project.email_subject_template_reminder IS
  'Optional reminder-email subject template (same placeholders plus {{dueDate}}); embedded in published cube meta';

DROP FUNCTION IF EXISTS edit_project_with_workspaces(bigint, text, text, bigint, text, bigint[], integer, text);

CREATE OR REPLACE FUNCTION edit_project_with_workspaces(
  p_project_id bigint,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_client_id bigint DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_workspace_ids bigint[] DEFAULT NULL,
  p_default_billing_due_days integer DEFAULT NULL,
  p_email_reply_invite_message text DEFAULT NULL,
  p_email_subject_template_invoice text DEFAULT NULL,
  p_email_subject_template_reminder text DEFAULT NULL
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
    END,
    email_subject_template_invoice = CASE
      WHEN p_email_subject_template_invoice IS NULL THEN email_subject_template_invoice
      ELSE NULLIF(BTRIM(p_email_subject_template_invoice), '')
    END,
    email_subject_template_reminder = CASE
      WHEN p_email_subject_template_reminder IS NULL THEN email_subject_template_reminder
      ELSE NULLIF(BTRIM(p_email_subject_template_reminder), '')
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

DROP FUNCTION IF EXISTS create_project_with_workspaces(text, text, bigint, text, bigint[], integer, text);

CREATE OR REPLACE FUNCTION create_project_with_workspaces(
  p_name text,
  p_description text,
  p_client_id bigint,
  p_status text,
  p_workspace_ids bigint[],
  p_default_billing_due_days integer DEFAULT NULL,
  p_email_reply_invite_message text DEFAULT NULL,
  p_email_subject_template_invoice text DEFAULT NULL,
  p_email_subject_template_reminder text DEFAULT NULL
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
    email_reply_invite_message,
    email_subject_template_invoice,
    email_subject_template_reminder
  )
  VALUES (
    p_name,
    p_description,
    p_client_id,
    p_status::project_status,
    COALESCE(p_default_billing_due_days, 14),
    NULLIF(BTRIM(COALESCE(p_email_reply_invite_message, '')), ''),
    NULLIF(BTRIM(COALESCE(p_email_subject_template_invoice, '')), ''),
    NULLIF(BTRIM(COALESCE(p_email_subject_template_reminder, '')), '')
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

GRANT EXECUTE ON FUNCTION edit_project_with_workspaces(bigint, text, text, bigint, text, bigint[], integer, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION edit_project_with_workspaces(bigint, text, text, bigint, text, bigint[], integer, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION create_project_with_workspaces(text, text, bigint, text, bigint[], integer, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_project_with_workspaces(text, text, bigint, text, bigint[], integer, text, text, text) TO service_role;
