import { createTimeRoleApi } from "@/api/time-role/time-role.api.http";
import { timeSupabase } from "@/core/timeSupabase.connected";

export const myTimeRoleApi = createTimeRoleApi(timeSupabase);
