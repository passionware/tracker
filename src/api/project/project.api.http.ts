import { dateFilterSupabaseUtils } from "@/api/_common/query/filters/DateFilter.supabase.ts";
import { enumFilterSupabaseUtils } from "@/api/_common/query/filters/EnumFilter.supabase.ts";
import { sorterSupabaseUtils } from "@/api/_common/query/sorters/Sorter.supabase.ts";
import {
  project$,
  projectFromHttp,
  projectContractor$,
  projectContractorFromHttp,
} from "@/api/project/project.api.http.schema.ts";
import { ProjectApi, Project } from "@/api/project/project.api.ts";
import { parseWithDataError } from "@/platform/zod/parseWithDataError.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export function createProjectApi(client: SupabaseClient): ProjectApi {
  return {
    getProjects: async (query) => {
      let request = client.from("project").select(`
        *,
        link_project_workspace!inner(*)
      `);

      if (query.search) {
        request = request.ilike("name", `%${query.search}%`);
      }

      if (query.sort) {
        request = sorterSupabaseUtils.sort(request, query.sort, {
          createdAt: "created_at",
        });
      }
      if (query.filters.workspaceId) {
        request = enumFilterSupabaseUtils.filterBy.oneToMany(
          request,
          query.filters.workspaceId,
          "link_project_workspace.workspace_id",
        );
      }
      if (query.filters.clientId) {
        request = enumFilterSupabaseUtils.filterBy.oneToMany(
          request,
          query.filters.clientId,
          "client_id",
        );
      }
      if (query.filters.createdAt) {
        request = dateFilterSupabaseUtils.filterBy(
          request,
          query.filters.createdAt,
          "created_at",
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
      return parseWithDataError(z.array(project$), data).map(projectFromHttp);
    },
    getProject: async (id) => {
      const { data, error } = await client
        .from("project")
        .select(
          `
          *,
          link_project_workspace(*)
        `,
        )
        .eq("id", id);

      if (error) {
        throw error;
      }

      if (data.length === 0) {
        throw new Error(`Project with id ${id} not found`);
      }

      return projectFromHttp(parseWithDataError(project$, data[0]));
    },
    getProjectContractors: async (projectId) => {
      // Query link_contractor_project with contractor and workspace data
      const { data, error } = await client
        .from("link_contractor_project")
        .select(
          `
          contractor_id,
          workspace_id,
          contractor:contractor_id (
            id,
            name,
            full_name,
            created_at,
            user_id
          )
        `,
        )
        .eq("project_id", projectId);

      if (error) {
        throw error;
      }

      return parseWithDataError(z.array(projectContractor$), data).map(
        projectContractorFromHttp,
      );
    },
    getProjectsByIds: async (ids) => {
      if (ids.length === 0) {
        return {};
      }
      const { data, error } = await client
        .from("project")
        .select(
          `
          *,
          link_project_workspace(*)
        `,
        )
        .in("id", ids);
      if (error) {
        throw error;
      }
      const projects = parseWithDataError(z.array(project$), data).map(
        projectFromHttp,
      );
      return Object.fromEntries(
        projects.map((project) => [project.id, project]),
      ) as Record<Project["id"], Project>;
    },
  };
}
