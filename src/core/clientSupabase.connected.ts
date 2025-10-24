import { createClient } from "@supabase/supabase-js";

/**
 * Separate Supabase client for client cockpit
 *
 * Can use either:
 * 1. Same Supabase project as main app (simpler)
 * 2. Different Supabase project (more isolation)
 *
 * Configuration via environment variables:
 * - If VITE_CLIENT_COCKPIT_SUPABASE_URL is set: uses separate project
 * - Otherwise: uses same project as main app (VITE_SUPABASE_URL)
 */
export const clientCockpitSupabase = createClient(
  import.meta.env.VITE_CLIENT_COCKPIT_SUPABASE_URL,
  import.meta.env.VITE_CLIENT_COCKPIT_SUPABASE_ANON_KEY,
  {
    auth: {
      // Each client cockpit session is separate from main app session
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: "client-cockpit-auth",
      storage: localStorage,
      autoRefreshToken: true,
      flowType: "pkce",
    },
    global: {
      headers: {
        // Optional: Add header to identify cockpit requests
        "X-Client-Cockpit": "true",
      },
    },
    db: {
      schema: import.meta.env.VITE_APP_COCKPIT_DB_SCHEMA,
    },
  },
);

/**
 * Optional: Create a type-safe client with schema inference
 * This would be useful if you have generated types from Supabase
 */
export type ClientCockpitSupabaseClient = typeof clientCockpitSupabase;
