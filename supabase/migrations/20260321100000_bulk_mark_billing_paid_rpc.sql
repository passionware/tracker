
CREATE OR REPLACE FUNCTION bulk_mark_billing_paid(p_entries jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  v_committed boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF jsonb_typeof(p_entries) IS DISTINCT FROM 'array' OR jsonb_array_length(p_entries) = 0 THEN
    RETURN;
  END IF;

  FOR rec IN
    SELECT
      (e->>'billing_id')::bigint AS billing_id,
      NULLIF(trim(e->>'paid_at'), '')::date AS paid_at,
      NULLIF(trim(e->>'paid_at_justification'), '') AS paid_at_justification
    FROM jsonb_array_elements(p_entries) AS e
  LOOP
    IF rec.billing_id IS NULL THEN
      RAISE EXCEPTION 'bulk_mark_billing_paid: missing billing_id';
    END IF;

    IF NOT billing_belongs_to_user_workspace(rec.billing_id) THEN
      RAISE EXCEPTION 'bulk_mark_billing_paid: access denied for billing %', rec.billing_id;
    END IF;

    SELECT b.is_committed
    INTO v_committed
    FROM billing b
    WHERE b.id = rec.billing_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'bulk_mark_billing_paid: billing % not found', rec.billing_id;
    END IF;

    IF v_committed THEN
      RAISE EXCEPTION 'bulk_mark_billing_paid: billing % is committed', rec.billing_id;
    END IF;

    UPDATE billing b
    SET
      paid_at = rec.paid_at,
      paid_at_justification = rec.paid_at_justification
    WHERE b.id = rec.billing_id;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION bulk_mark_billing_paid(jsonb) IS
  'Sets paid_at / paid_at_justification for many billings; enforces workspace access and not committed.';

REVOKE ALL ON FUNCTION bulk_mark_billing_paid(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bulk_mark_billing_paid(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_mark_billing_paid(jsonb) TO service_role;
