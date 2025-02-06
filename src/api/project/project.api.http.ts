import { enumFilterSupabaseUtils } from "@/api/_common/query/filters/EnumFilter.supabase.ts";
import {
  project$,
  projectFromHttp,
} from "@/api/project/project.api.http.schema.ts";
import { ProjectApi } from "@/api/project/project.api.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export function createProjectApi(client: SupabaseClient): ProjectApi {
  return {
    getProjects: async (query) => {
      let request = client.from("project").select("*");

      if (query.search) {
        request = request.ilike("name", `%${query.search}%`);
      }

      if (query.sort) {
        request = request.order(query.sort.field, {
          ascending: query.sort.order === "asc",
        });
      }
      if (query.filters.workspaceId) {
        request = enumFilterSupabaseUtils.filterBy.oneToMany(
          request,
          query.filters.workspaceId,
          "workspace_id",
        );
      }
      if (query.filters.clientId) {
        request = enumFilterSupabaseUtils.filterBy.oneToMany(
          request,
          query.filters.clientId,
          "client_id",
        );
      }
      if (query.filters.status) {
        request = enumFilterSupabaseUtils.filterBy.oneToMany(
          request,
          query.filters.status,
          "status",
        );
      }

      const { data, error } = await request;

      if (error) {
        throw error;
      }
      return z.array(project$).parse(data).map(projectFromHttp);
    },
    getProject: async (id) => {
      const { data, error } = await client
        .from("project")
        .select("*")
        .eq("id", id);

      if (error) {
        throw error;
      }

      if (data.length === 0) {
        throw new Error(`Project with id ${id} not found`);
      }

      return projectFromHttp(project$.parse(data[0]));
    },
  };
}
