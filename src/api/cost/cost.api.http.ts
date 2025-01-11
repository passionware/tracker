import { cost$, costFromHttp } from "@/api/cost/cost.api.http.schema.ts";
import { CostApi } from "@/api/cost/cost.api.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export function createCostApi(client: SupabaseClient): CostApi {
  return {
    getCosts: async (query) => {
      let request = client.from("costs_with_details").select("*");
      if (query.search) {
        request = request
          .ilike("invoice_number", `%${query.search}%`)
          .or(`counterparty.ilike('%${query.search}%')`);
      }
      if (query.filters.workspaceId) {
        switch (query.filters.workspaceId.operator) {
          case "oneOf": {
            request = request.in(
              "workspace_id",
              query.filters.workspaceId.value,
            );
            break;
          }
          case "matchNone": {
            request = request.not(
              "workspace_id",
              "in",
              query.filters.workspaceId.value,
            );
            break;
          }
        }
      }
      if (query.filters.clientId) {
        switch (query.filters.clientId.operator) {
          case "oneOf": {
            // Sprawdzanie, czy client_ids zawiera przynajmniej jeden z podanych clientId
            request = request.contains(
              "client_ids",
              `{${query.filters.clientId.value.join(",")}}`,
            );
            break;
          }
          case "matchNone": {
            // Sprawdzanie, czy client_ids NIE zawiera żadnego z podanych clientId
            request = request.not(
              "client_ids",
              "contains",
              `{${query.filters.clientId.value.join(",")}}`,
            );
            break;
          }
        }
      }

      if (query.filters.contractorId) {
        switch (query.filters.contractorId.operator) {
          case "oneOf": {
            request = request.in(
              "contractor_id",
              query.filters.contractorId.value,
            );
            break;
          }
          case "matchNone": {
            request = request.not(
              "contractor_id",
              "in",
              query.filters.contractorId.value,
            );
            break;
          }
        }
      }

      const { data, error } = await request;
      if (error) {
        throw error;
      }
      return z.array(cost$).parse(data).map(costFromHttp);
    },
    getCost: async (id) => {
      const { data, error } = await client
        .from("costs")
        .select("*")
        .eq("id", id);
      if (error) {
        throw error;
      }
      return costFromHttp(cost$.parse(data[0]));
    },
  };
}
