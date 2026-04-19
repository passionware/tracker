import { createTimeEntryApi } from "@/api/time-entry/time-entry.api.http";
import { timeSupabase } from "@/core/timeSupabase.connected";

export const myTimeEntryApi = createTimeEntryApi(timeSupabase);
