import { enumFilterSupabaseUtils } from "@/api/_common/query/filters/EnumFilter.supabase.ts";
import {
  variable$,
  variableFromHttp,
} from "@/api/variable/variable.api.http.schema.ts";
import { VariableApi } from "@/api/variable/variable.api.ts";
import { parseWithDataError } from "@/platform/zod/parseWithDataError.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { snakeCase } from "lodash";
import * as snakecaseKeys from "snakecase-keys";
import { z } from "zod";

export function createVariableApi(client: SupabaseClient): VariableApi {
  return {
    getVariables: async (query) => {
      let request = client.from("variable").select("*");
      if (query.filters.type) {
        request = enumFilterSupabaseUtils.filterBy.oneToMany(
          request,
          query.filters.type,
          "type",
        );
      }
      if (query.filters.workspaceId) {
        request = enumFilterSupabaseUtils.filterBy.oneToMany(
          request,
          query.filters.workspaceId,
          "workspace_id",
        );
      }
      if (query.filters.clientId) {
        request = enumFilterSupabaseUtils.filterBy.oneToMany(
          request,
          query.filters.clientId,
          "client_id",
        );
      }
      if (query.filters.contractorId) {
        request = enumFilterSupabaseUtils.filterBy.oneToMany(
          request,
          query.filters.contractorId,
          "contractor_id",
        );
      }

      // sorting

      if (query.sort) {
        request = request.order(snakeCase(query.sort.field), {
          ascending: query.sort.order === "asc",
        });
      }

      // pagination
      //todo

      const { data, error } = await request;
      if (error) {
        throw error;
      }

      return parseWithDataError(z.array(variable$), data).map(variableFromHttp);
    },
    createVariable: async (variable) => {
      const { data, error } = await client
        .from("variable")
        // @ts-expect-error - for some reason Variable is not assignable to Record<string, unknown>???
        .insert(snakecaseKeys(variable));
      if (error) {
        throw error;
      }
      return parseWithDataError(variable$, data);
    },
    updateVariable: async (id, variable) => {
      const { data, error } = await client
        .from("variable")
        .update(snakecaseKeys(variable))
        .match({ id });
      if (error) {
        throw error;
      }
      parseWithDataError(variable$.pick({ id: true }), data);
    },
    deleteVariable: async (id) => {
      const { error } = await client.from("variable").delete().match({ id });
      if (error) {
        throw error;
      }
    },
  };
}
