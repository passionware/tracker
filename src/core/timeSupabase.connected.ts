import { createClient } from "@supabase/supabase-js";

/**
 * Third Supabase client, scoped to the event-sourced time-tracking schema
 * (`time_dev` or `time_prod`). The schema is selected at build time via
 * `VITE_APP_TIME_DB_SCHEMA`. Defaults to `time_dev` so a fresh checkout points
 * at the development schema unless a deploy explicitly opts into `time_prod`.
 *
 * Reads only:
 *   - the read-model projection tables (`entry`, `task_current`,
 *     `activity_current`, `rate_current`, `period_lock`, `task_actuals`).
 * Writes go through the Cloudflare Worker (`workers/time-events`), never
 * directly through this client. RLS on the projection tables already revokes
 * INSERT/UPDATE/DELETE from authenticated.
 *
 * Auth is shared with `mySupabase` (same `storageKey`), so the same browser
 * session is used to authenticate read requests against the time schema.
 */

/** Default schema when `VITE_APP_TIME_DB_SCHEMA` is not set. */
const DEFAULT_TIME_SCHEMA = "time_dev";

export const TIME_DB_SCHEMA: string =
  import.meta.env.VITE_APP_TIME_DB_SCHEMA ?? DEFAULT_TIME_SCHEMA;

export const timeSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY,
  {
    auth: {
      storageKey: "sb-main-auth-token",
      storage: localStorage,
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
      flowType: "pkce",
    },
    db: {
      schema: import.meta.env.VITE_APP_TIME_DB_SCHEMA ?? DEFAULT_TIME_SCHEMA,
    },
  },
);

export type TimeSupabaseClient = typeof timeSupabase;
