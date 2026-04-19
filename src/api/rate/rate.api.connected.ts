import { createProjectRateApi } from "@/api/rate/rate.api.http";
import { timeSupabase } from "@/core/timeSupabase.connected";

export const myProjectRateApi = createProjectRateApi(timeSupabase);
