import { enumFilterSupabaseUtils } from "@/api/_common/query/filters/EnumFilter.supabase.ts";
import { sorterSupabaseUtils } from "@/api/_common/query/sorters/Sorter.supabase.ts";
import {
  contractor$,
  contractorFromHttp,
} from "@/api/contractor/contractor.api.http.schema.ts";
import { ContractorApi } from "@/api/contractor/contractor.api.ts";
import { parseWithDataError } from "@/platform/zod/parseWithDataError.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export function createContractorApi(client: SupabaseClient): ContractorApi {
  return {
    getContractors: async (query) => {
      let request = client.from("contractor").select("*");
      if (query.search) {
        request = request.ilike("full_name", `%${query.search}%`);
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
          createdAt: "created_at",
          fullName: "full_name",
        });
      }

      const { data, error } = await request;
      if (error) {
        throw error;
      }
      return parseWithDataError(z.array(contractor$), data).map(
        contractorFromHttp,
      );
    },
    getContractor: async (id) => {
      const { data, error } = await client
        .from("contractor")
        .select("*")
        .eq("id", id);
      if (error) {
        throw error;
      }
      return contractorFromHttp(parseWithDataError(contractor$, data[0]));
    },
  };
}
