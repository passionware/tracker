import { enumFilterSupabaseUtils } from "@/api/_common/query/filters/EnumFilter.supabase.ts";
import { sorterSupabaseUtils } from "@/api/_common/query/sorters/Sorter.supabase.ts";
import {
  projectIteration$,
  projectIterationDetail$,
  projectIterationDetailFromHttp,
  projectIterationFromHttp,
} from "@/api/project-iteration/project-iteration.api.http.schema.ts";
import { parseWithDataError } from "@/platform/zod/parseWithDataError.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ProjectIterationApi, ProjectIteration } from "./project-iteration.api";

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
          ordinalNumber: "ordinal_number",
        });
      }
      const { data, error } = await request;
      if (error) {
        throw error;
      }
      return parseWithDataError(z.array(projectIteration$), data).map(
        projectIterationFromHttp,
      );
    },
    getProjectIterationDetail: async (id) => {
      const { data, error } = await client
        .from("project_iteration")
        .select("*, project_iteration_position(*)")
        .eq("id", id)
        .order("order", {
          ascending: true,
          foreignTable: "project_iteration_position",
        })
        .single();
      if (error) {
        throw error;
      }

      return projectIterationDetailFromHttp(
        parseWithDataError(projectIterationDetail$, data),
      );
    },
    getProjectIterationsByIds: async (ids) => {
      if (ids.length === 0) {
        return {};
      }
      const { data, error } = await client
        .from("project_iteration")
        .select("*")
        .in("id", ids);
      if (error) {
        throw error;
      }
      const iterations = parseWithDataError(
        z.array(projectIteration$),
        data,
      ).map(projectIterationFromHttp);
      return Object.fromEntries(
        iterations.map((iteration) => [iteration.id, iteration]),
      ) as Record<ProjectIteration["id"], ProjectIteration>;
    },
  };
}
