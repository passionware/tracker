import {
  activity$,
  activityFromHttp,
} from "@/api/activity/activity.api.http.schema";
import type { ActivityApi } from "@/api/activity/activity.api";
import { parseWithDataError } from "@/platform/zod/parseWithDataError";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const DEFAULT_LIMIT = 200;

export function createActivityApi(client: SupabaseClient): ActivityApi {
  return {
    getActivities: async (query) => {
      let request = client
        .from("activity_current")
        .select("*")
        .order("name", { ascending: true })
        .limit(query.limit ?? DEFAULT_LIMIT);
      if (query.projectId !== undefined)
        request = request.eq("project_id", query.projectId);
      if (!query.includeArchived) request = request.eq("is_archived", false);
      if (query.kind) request = request.contains("kinds", [query.kind]);
      const { data, error } = await request;
      if (error) throw error;
      return parseWithDataError(z.array(activity$), data ?? []).map(
        activityFromHttp,
      );
    },
    getActivity: async (activityId) => {
      const { data, error } = await client
        .from("activity_current")
        .select("*")
        .eq("id", activityId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return activityFromHttp(parseWithDataError(activity$, data));
    },
  };
}
