import { numberFilterSupabaseUtils } from "@/api/_common/query/filters/NumberFilter.supabase.ts";
import {
  clientBilling$,
  clientBillingFromHttp,
} from "@/api/client-billing/client-billing.api.http.schema.ts";
import { ClientBillingApi } from "@/api/client-billing/client-billing.api.ts";
import { parseWithDataError } from "@/platform/zod/parseWithDataError.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { snakeCase } from "lodash";
import { z } from "zod";

export function createClientBillingApi(
  client: SupabaseClient,
): ClientBillingApi {
  return {
    getClientBillings: async (query) => {
      let request = client.from("billing_with_details").select("*");
      if (query.filters.contractorId) {
        switch (query.filters.contractorId.operator) {
          case "oneOf":
            if (query.filters.contractorId.value.includes(null)) {
              const contractorIds = query.filters.contractorId.value.filter(
                (id) => id !== null,
              );
              if (contractorIds.length > 0) {
                request = request.or(
                  `linked_contractor_ids.cs.{${contractorIds.join(",")}},linked_contractor_ids.eq.{}`,
                );
              } else {
                // Jeśli jedyny element to `null`, filtruj tylko puste tablice
                request = request.eq("linked_contractor_ids", "{}");
              }
            } else {
              request = request.contains(
                "linked_contractor_ids",
                query.filters.contractorId.value,
              );
            }
            break;
          case "matchNone":
            throw new Error("Operator matchNone not implemented");

          default:
            throw new Error(
              `Operator ${query.filters.contractorId.operator} not implemented`,
            );
        }
      }

      if (query.filters.remainingAmount) {
        request = numberFilterSupabaseUtils.filterBy(
          request,
          query.filters.remainingAmount,
          "remaining_balance",
        );
      }

      if (query.filters.workspaceId) {
        switch (query.filters.workspaceId.operator) {
          case "oneOf":
            request = request.in(
              "workspace_id",
              query.filters.workspaceId.value,
            );
            break;
          case "matchNone":
            request = request.not(
              "workspace_id",
              "in",
              query.filters.workspaceId.value,
            );
            break;
        }
      }
      if (query.filters.clientId) {
        switch (query.filters.clientId.operator) {
          case "oneOf":
            request = request.in("client_id", query.filters.clientId.value);
            break;
          case "matchNone": // opposite of oneOf
            request = request.not(
              "client_id",
              "in",
              query.filters.clientId.value,
            );
            break;
        }
      }
      if (query.sort) {
        request = request.order(snakeCase(query.sort.field), {
          ascending: query.sort.order === "asc",
        });
      }

      const { data, error } = await request;
      if (error) {
        throw error;
      }
      return parseWithDataError(z.array(clientBilling$), data).map(
        clientBillingFromHttp,
      );
    },
  };
}
