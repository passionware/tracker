import { cost$, costFromHttp } from "@/api/cost/cost.api.http.schema.ts";
import { CostApi } from "@/api/cost/cost.api.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export function createCostApi(client: SupabaseClient): CostApi {
  return {
    getCosts: async (query) => {
      let request = client.from("cost_with_details").select("*");
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
        const { operator, value } = query.filters.clientId;

        const arrayToken = `{${value.map((v) => (v === null ? -1 : v)).join(",")}}`;

        switch (operator) {
          case "oneOf": {
            request = request.filter("client_ids", "ov", arrayToken);
            break;
          }
          case "matchNone": {
            request = request.not("client_ids", "ov", arrayToken);
            break;
          }
          default:
            throw new Error(`Unsupported operator: ${operator}`);
        }
      }
      if (query.filters.potentialClientId) {
        const { operator, value } = query.filters.potentialClientId;

        const arrayToken = `{${value.map((v) => (v === null ? -1 : v)).join(",")}}`;

        switch (operator) {
          case "oneOf": {
            request = request.filter("potential_clients", "ov", arrayToken);
            break;
          }
          case "matchNone": {
            request = request.not("potential_clients", "ov", arrayToken);
            break;
          }
          default:
            throw new Error(`Unsupported operator: ${operator}`);
        }
      }
      if (query.filters.contractorId) {
        const { operator, value } = query.filters.contractorId;

        if (!Array.isArray(value)) {
          throw new Error("contractorId.value must be an array");
        }

        const filteredValues = value.filter((v) => v !== null);

        switch (operator) {
          case "oneOf": {
            if (value.includes(null)) {
              // Tworzymy zapytanie `or` dla wartości w tablicy oraz `null`
              const orFilter = [
                `contractor_id.in.(${filteredValues.join(",")})`,
                `contractor_id.is.null`,
              ].join(",");

              request = request.or(orFilter);
            } else {
              request = request.in("contractor_id", filteredValues);
            }
            break;
          }
          case "matchNone": {
            if (value.includes(null)) {
              // Tworzymy zapytanie `or` dla wykluczenia wartości oraz `null`
              const orFilter = [
                `contractor_id.notin.(${filteredValues.join(",")})`,
                `contractor_id.not.is.null`,
              ].join(",");

              request = request.or(orFilter);
            } else {
              request = request.not("contractor_id", "in", filteredValues);
            }
            break;
          }
          default:
            throw new Error(`Unsupported operator: ${operator}`);
        }
      }
      if (query.filters.linkedRemainder) {
        const { operator, value } = query.filters.linkedRemainder;
        switch (operator) {
          case "greaterThan": {
            request = request.gt("linked_reports_remainder", value);
            break;
          }
          case "lessThan": {
            request = request.lt("linked_reports_remainder", value);
            break;
          }
          case "between": {
            request = request
              .lt("linked_reports_remainder", value.to)
              .gt("linked_reports_remainder", value.from);
            break;
          }
          case "equal": {
            request = request.eq("linked_reports_remainder", value);
            break;
          }
          default:
            throw new Error(`Unsupported operator: ${operator}`);
        }
      }

      if (query.filters.linkedAmount) {
        const { operator, value } = query.filters.linkedAmount;
        switch (operator) {
          case "greaterThan": {
            request = request.gt("linked_reports_amount", value);
            break;
          }
          case "lessThan": {
            request = request.lt("linked_reports_amount", value);
            break;
          }
          case "between": {
            request = request
              .lt("linked_reports_amount", value.to)
              .gt("linked_reports_amount", value.from);
            break;
          }
          case "equal": {
            request = request.eq("linked_reports_amount", value);
            break;
          }
          default:
            throw new Error(`Unsupported operator: ${operator}`);
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
        .from("cost")
        .select("*")
        .eq("id", id);
      if (error) {
        throw error;
      }
      return costFromHttp(cost$.parse(data[0]));
    },
  };
}
