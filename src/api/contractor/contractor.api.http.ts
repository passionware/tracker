import {
  contractor$,
  contractorFromHttp,
} from "@/api/contractor/contractor.api.http.schema.ts";
import { ContractorApi } from "@/api/contractor/contractor.api.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export function createContractorApi(client: SupabaseClient): ContractorApi {
  return {
    getContractors: async (query) => {
      let request = client.from("contractors").select("*");
      if (query.search) {
        request = request.ilike("name", `%${query.search}%`);
      }

      const { data, error } = await request;
      if (error) {
        throw error;
      }
      return z.array(contractor$).parse(data).map(contractorFromHttp);
    },
    getContractor: async (id) => {
      const { data, error } = await client
        .from("contractors")
        .select("*")
        .eq("id", id);
      if (error) {
        throw error;
      }
      return contractorFromHttp(data[0]);
    },
  };
}
