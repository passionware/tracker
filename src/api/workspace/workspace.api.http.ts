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
        request = request
          .ilike("name", `%${query.search}%`)
          .or(`slug.ilike('%${query.search}%')`);
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
      return workspaceFromHttp(workspace$.parse(data[0]));
    },
  };
}
