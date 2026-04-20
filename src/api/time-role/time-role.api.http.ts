import type {
  TimeRoleApi,
  TimeRoleQuery,
} from "@/api/time-role/time-role.api";
import {
  timeRole$,
  timeRoleFromHttp,
} from "@/api/time-role/time-role.api.http.schema";
import { parseWithDataError } from "@/platform/zod/parseWithDataError";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export function createTimeRoleApi(client: SupabaseClient): TimeRoleApi {
  return {
    getRoles: async (query) => {
      let request = client.from("role").select("*");
      if (query.userId !== undefined)
        request = request.eq("user_id", query.userId);
      if (query.role !== undefined) {
        request = Array.isArray(query.role)
          ? request.in("role", query.role)
          : request.eq("role", query.role);
      }
      if (query.scopeProjectId !== undefined)
        request = request.eq("scope_project_id", query.scopeProjectId);
      const { data, error } = await request;
      if (error) throw error;
      return parseWithDataError(z.array(timeRole$), data ?? []).map(
        timeRoleFromHttp,
      );
    },
  };
}

export type { TimeRoleQuery };
