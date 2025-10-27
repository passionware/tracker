import { SupabaseClient } from "@supabase/supabase-js";
import { parseWithDataError } from "@/platform/zod/parseWithDataError.ts";
import { CockpitTenantsApi } from "./cockpit-tenants.api";
import { cockpitTenant$ } from "./cockpit-tenants.api.http.schema";

export function createCockpitTenantsApi(
  client: SupabaseClient,
): CockpitTenantsApi {
  return {
    getTenant: async (tenantId) => {
      const { data, error } = await client
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single();

      if (error) {
        console.error("Error fetching tenant:", error);
        throw error;
      }

      return parseWithDataError(cockpitTenant$, data);
    },
  };
}
