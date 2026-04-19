import { createActivityApi } from "@/api/activity/activity.api.http";
import { timeSupabase } from "@/core/timeSupabase.connected";

export const myActivityApi = createActivityApi(timeSupabase);
