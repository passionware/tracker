import { enumFilterSupabaseUtils } from "@/api/_common/query/filters/EnumFilter.supabase.ts";
import { sorterSupabaseUtils } from "@/api/_common/query/sorters/Sorter.supabase.ts";
import { projectIterationFromHttp } from "@/api/project-iteration/project-iteration.api.http.schema.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { ProjectIterationApi } from "./project-iteration.api";

export function createProjectIterationApi(
  client: SupabaseClient,
): ProjectIterationApi {
  return {
    getProjectIterations: async (query) => {
      let request = client.from("project_iteration").select("*");
      if (query.filters.projectId) {
        request = enumFilterSupabaseUtils.filterBy.oneToMany(
          request,
          query.filters.projectId,
          "project_id",
        );
      }
      if (query.filters.status) {
        request = enumFilterSupabaseUtils.filterBy.oneToMany(
          request,
          query.filters.status,
          "status",
        );
      }
      if (query.sort) {
        request = sorterSupabaseUtils.sort(request, query.sort, {
          periodStart: "period_start",
          periodEnd: "period_end",
          status: "status",
        });
      }
      const { data, error } = await request;
      if (error) {
        throw error;
      }
      return data.map(projectIterationFromHttp);
    },
    getProjectIterationDetail: async (id) => {
      const { data, error } = await client
        .from("project_iteration")
        .select("*")
        .eq("id", id)
        .single();
      if (error) {
        throw error;
      }
      return projectIterationFromHttp(data);
    },
  };
}
