import { cost$, costFromHttp } from "@/api/cost/cost.api.http.schema.ts";
import { CostApi } from "@/api/cost/cost.api.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export function createCostApi(client: SupabaseClient): CostApi {
  return {
    getCosts: async (query) => {
      let request = client.from("costs").select("*");
      if (query.search) {
        request = request
          .ilike("invoice_number", `%${query.search}%`)
          .or(`counterparty.ilike('%${query.search}%')`);
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
