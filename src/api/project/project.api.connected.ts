import { createProjectApi } from "@/api/project/project.api.http.ts";
import { mySupabase } from "@/core/supabase.connected.ts";

export const myProjectApi = createProjectApi(mySupabase);
