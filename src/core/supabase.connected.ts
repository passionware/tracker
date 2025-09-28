import { createClient } from "@supabase/supabase-js";

export const mySupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY,
);
