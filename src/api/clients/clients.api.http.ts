import { fromHttp } from "@/api/clients/clients.api.http.adapter.ts";
import { client$ } from "@/api/clients/clients.api.http.schema.ts";
import { ClientsApi } from "@/api/clients/clients.api.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export function createClientsApi(client: SupabaseClient): ClientsApi {
  return {
    getClients: async () => {
      const { data, error } = await client.from("client").select("*");
      if (error) {
        throw error;
      }
      return z.array(client$).parse(data).map(fromHttp);
    },
    getClient: async (id) => {
      const { data, error } = await client
        .from("clients")
        .select("*")
        .eq("id", id);
      if (error) {
        throw error;
      }
      return fromHttp(z.array(client$).parse(data)[0]);
    },
  };
}
