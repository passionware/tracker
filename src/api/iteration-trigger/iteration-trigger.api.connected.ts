import { createIterationTriggerApi } from "@/api/iteration-trigger/iteration-trigger.api.http";
import { mySupabase } from "@/core/supabase.connected";

export const myIterationTriggerApi = createIterationTriggerApi(mySupabase);
