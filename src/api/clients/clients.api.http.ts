import { enumFilterSupabaseUtils } from "@/api/_common/query/filters/EnumFilter.supabase.ts";
import { clientFromHttp } from "@/api/clients/clients.api.http.adapter.ts";
import { client$ } from "@/api/clients/clients.api.http.schema.ts";
import { ClientsApi } from "@/api/clients/clients.api.ts";
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
      const { data, error } = await request;
      if (error) {
        throw error;
      }
      return z.array(client$).parse(data).map(clientFromHttp);
    },
    getClient: async (id) => {
      const { data, error } = await client
        .from("client")
        .select("*")
        .eq("id", id);
      if (error) {
        throw error;
      }
      return clientFromHttp(z.array(client$).parse(data)[0]);
    },
  };
}
