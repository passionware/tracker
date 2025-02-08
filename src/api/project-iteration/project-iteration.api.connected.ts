import { createProjectIterationApi } from "@/api/project-iteration/project-iteration.api.http.ts";
import { mySupabase } from "@/core/supabase.connected.ts";

export const myProjectIterationApi = createProjectIterationApi(mySupabase);
