import { enumFilterSupabaseUtils } from "@/api/_common/query/filters/EnumFilter.supabase.ts";
import { booleanFilterSupabaseUtils } from "@/api/_common/query/filters/BooleanFilter.supabase.ts";
import { sorterSupabaseUtils } from "@/api/_common/query/sorters/Sorter.supabase.ts";
import {
  workspace$,
  workspaceFromHttp,
} from "@/api/workspace/workspace.api.http.schema.ts";
import { WorkspaceApi } from "@/api/workspace/workspace.api.ts";
import { parseWithDataError } from "@/platform/zod/parseWithDataError.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export function createWorkspaceApi(client: SupabaseClient): WorkspaceApi {
  return {
    getWorkspaces: async (query) => {
      let request = client.from("workspace").select("*");

      if (query.search) {
        // PostgREST filter syntax rejects SQL-style `'...'` inside `.or()` (PGRST100).
        // Use `col.ilike."pattern"` with double quotes; double any `"` inside the pattern.
        const term = query.search.replace(/"/g, '""');
        request = request.or(
          `name.ilike."%${term}%",slug.ilike."%${term}%"`,
        );
      }

      if (query.filters.id) {
        request = enumFilterSupabaseUtils.filterBy.oneToMany(
          request,
          query.filters.id,
          "id",
        );
      }

      if (query.filters.hidden) {
        request = booleanFilterSupabaseUtils.filterBy(
          request,
          query.filters.hidden,
          "hidden",
        );
      }

      if (query.sort) {
        request = sorterSupabaseUtils.sort(request, query.sort, {});
      }

      const { data, error } = await request;
      if (error) {
        throw error;
      }
      return parseWithDataError(z.array(workspace$), data).map(
        workspaceFromHttp,
      );
    },
    getWorkspace: async (id) => {
      const { data, error } = await client
        .from("workspace")
        .select("*")
        .eq("id", id);
      if (error) {
        throw error;
      }
      return workspaceFromHttp(
        parseWithDataError(z.array(workspace$), data)[0],
      );
    },
  };
}
