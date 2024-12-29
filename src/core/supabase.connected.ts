import { createClient } from "@supabase/supabase-js";

export const mySupabase = createClient(
  "https://keyaueejsnihhnfxmthd.supabase.co",
  import.meta.env.VITE_SUPABASE_KEY,
);
