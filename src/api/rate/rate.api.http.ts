import {
  projectRate$,
  projectRateFromHttp,
} from "@/api/rate/rate.api.http.schema";
import type { ProjectRateApi } from "@/api/rate/rate.api";
import { parseWithDataError } from "@/platform/zod/parseWithDataError";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export function createProjectRateApi(client: SupabaseClient): ProjectRateApi {
  return {
    getCurrentRate: async (projectId, contractorId) => {
      const { data, error } = await client
        .from("rate_current")
        .select("*")
        .eq("project_id", projectId)
        .eq("contractor_id", contractorId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return projectRateFromHttp(parseWithDataError(projectRate$, data));
    },
    getRatesForProject: async (projectId) => {
      const { data, error } = await client
        .from("rate_current")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return parseWithDataError(z.array(projectRate$), data ?? []).map(
        projectRateFromHttp,
      );
    },
    getRatesForContractor: async (contractorId) => {
      const { data, error } = await client
        .from("rate_current")
        .select("*")
        .eq("contractor_id", contractorId);
      if (error) throw error;
      return parseWithDataError(z.array(projectRate$), data ?? []).map(
        projectRateFromHttp,
      );
    },
  };
}
