import { createClient } from "@supabase/supabase-js";

export const mySupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY,
  {
    auth: {
      storageKey: "sb-main-auth-token",
      storage: localStorage,
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
      flowType: "pkce", // Use PKCE flow for better security
    },
    db: {
      schema: import.meta.env.VITE_APP_MAIN_DB_SCHEMA,
    },
  },
);
