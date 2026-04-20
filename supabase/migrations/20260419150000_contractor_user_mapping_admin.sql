-- Contractor ↔ auth.users mapping (Commit B of the "assignees use contractor.id"
-- refactor). The `contractor.user_id` column already exists (see
-- 20250928092755_production_schema_mirror), with an FK to auth.users. We add:
--
--   1. Partial UNIQUE index so one auth user can map to at most one
--      contractor — the model is "personal timesheet per login".
--   2. RLS UPDATE policy restricted to super_admins, for the happy path
--      where an admin edits the row directly.
--   3. `set_contractor_user(p_contractor_id, p_user_id)` SECURITY DEFINER
--      RPC as the explicit API the admin UI talks to (keeps the caller-side
--      contract narrow — no other columns can be updated via this path).
--   4. `list_auth_user_directory()` SECURITY DEFINER RPC returning
--      `{id, email}` rows so the admin UI can render a user picker without
--      the frontend needing the service_role key or direct `auth.users`
--      SELECT access.
--
-- Both RPCs gate on "caller has a super_admin grant in role". That's the
-- same predicate `deriveAdminScope` checks on the frontend.

CREATE UNIQUE INDEX IF NOT EXISTS contractor_user_id_unique_idx
  ON contractor (user_id)
  WHERE user_id IS NOT NULL;

COMMENT ON INDEX contractor_user_id_unique_idx IS
  'One auth user maps to at most one contractor. NULLs allowed (contractors without a login).';

CREATE POLICY "admin update contractor" ON contractor
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM role r
    WHERE r.user_id = auth.uid() AND r.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM role r
    WHERE r.user_id = auth.uid() AND r.role = 'super_admin'
  )
);

CREATE OR REPLACE FUNCTION set_contractor_user(
  p_contractor_id bigint,
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM role r
    WHERE r.user_id = auth.uid() AND r.role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'set_contractor_user: only super_admins may reassign contractor logins';
  END IF;

  -- Nullable assignment: passing NULL unlinks the current mapping.
  UPDATE contractor
  SET user_id = p_user_id
  WHERE id = p_contractor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'set_contractor_user: contractor % not found', p_contractor_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION set_contractor_user(bigint, uuid) IS
  'Admin-only. Links (or unlinks when p_user_id is NULL) a contractor row to an auth.users id. Partial UNIQUE index on (user_id) enforces the one-user-one-contractor invariant.';

GRANT EXECUTE ON FUNCTION set_contractor_user(bigint, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION list_auth_user_directory()
RETURNS TABLE(id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM role r
    WHERE r.user_id = auth.uid() AND r.role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'list_auth_user_directory: only super_admins may browse the user directory';
  END IF;

  RETURN QUERY
    SELECT u.id, u.email::text
    FROM auth.users u
    ORDER BY u.email NULLS LAST, u.id;
END;
$$;

COMMENT ON FUNCTION list_auth_user_directory() IS
  'Admin-only picker feed: (id, email) pairs for every auth user. Keeps service_role off the frontend while still letting admins pair contractors with logins.';

GRANT EXECUTE ON FUNCTION list_auth_user_directory() TO authenticated;
