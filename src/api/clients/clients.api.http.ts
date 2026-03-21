import { enumFilterSupabaseUtils } from "@/api/_common/query/filters/EnumFilter.supabase.ts";
import { sorterSupabaseUtils } from "@/api/_common/query/sorters/Sorter.supabase.ts";
import { clientFromHttp } from "@/api/clients/clients.api.http.adapter.ts";
import {
  client$,
  linkWorkspaceClientWithWorkspace$,
} from "@/api/clients/clients.api.http.schema.ts";
import { workspaceFromHttp } from "@/api/workspace/workspace.api.http.schema.ts";
import { ClientsApi } from "@/api/clients/clients.api.ts";
import { parseWithDataError } from "@/platform/zod/parseWithDataError.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export function createClientsApi(client: SupabaseClient): ClientsApi {
  return {
    getClients: async (query) => {
      let request = client.from("client").select("*");
      if (query.search) {
        request = request.ilike("name", `%${query.search}%`);
      }
      if (query.filters.id) {
        request = enumFilterSupabaseUtils.filterBy.oneToMany(
          request,
          query.filters.id,
          "id",
        );
      }
      if (query.sort) {
        request = sorterSupabaseUtils.sort(request, query.sort, {
          senderName: "sender_name",
        });
      }
      const { data, error } = await request;
      if (error) {
        throw error;
      }
      return parseWithDataError(z.array(client$), data).map(clientFromHttp);
    },
    getClient: async (id) => {
      const { data, error } = await client
        .from("client")
        .select("*")
        .eq("id", id);
      if (error) {
        throw error;
      }
      return clientFromHttp(parseWithDataError(z.array(client$), data)[0]);
    },
    getLinkedWorkspacesForClient: async (clientId) => {
      const { data, error } = await client
        .from("link_workspace_client")
        .select(
          `
          workspace:workspace_id (
            id,
            name,
            slug,
            avatar_url
          )
        `,
        )
        .eq("client_id", clientId);
      if (error) {
        throw error;
      }
      return parseWithDataError(
        z.array(linkWorkspaceClientWithWorkspace$),
        data,
      ).map((row) => workspaceFromHttp(row.workspace));
    },
  };
}
