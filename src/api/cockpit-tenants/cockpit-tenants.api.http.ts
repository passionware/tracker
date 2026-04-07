import { SupabaseClient } from "@supabase/supabase-js";
import { pickBy } from "lodash";
import { parseWithDataError } from "@/platform/zod/parseWithDataError.ts";
import { CockpitTenant, CockpitTenantsApi } from "./cockpit-tenants.api";
import {
  cockpitTenant$,
  CockpitTenant$,
} from "./cockpit-tenants.api.http.schema";

function cockpitTenantFromRow(row: CockpitTenant$): CockpitTenant {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    workspaceName: row.workspace_name,
    workspaceLogoUrl: row.workspace_logo_url,
    clientLogoUrl: row.client_logo_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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

      return cockpitTenantFromRow(parseWithDataError(cockpitTenant$, data));
    },
    updateTenantSettings: async (tenantId, payload) => {
      const row = pickBy(
        {
          name: payload.name,
          workspace_name: payload.workspaceName,
          workspace_logo_url: payload.workspaceLogoUrl,
          client_logo_url: payload.clientLogoUrl,
        },
        (v) => v !== undefined,
      );
      if (Object.keys(row).length === 0) {
        return;
      }
      const { error } = await client
        .from("tenants")
        .update(row)
        .eq("id", tenantId);
      if (error) {
        throw error;
      }
    },
  };
}
