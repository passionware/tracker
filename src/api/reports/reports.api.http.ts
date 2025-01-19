import { numberFilterSupabaseUtils } from "@/api/_common/query/filters/NumberFilter.supabase.ts";
import {
  report$,
  reportFromHttp,
} from "@/api/reports/reports.api.http.schema.ts";
import { parseWithDataError } from "@/platform/zod/parseWithDataError.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { snakeCase } from "lodash";
import { z } from "zod";
import { ReportApi } from "./reports.api.ts";

export function createReportsApi(
  client: SupabaseClient,
): ReportApi {
  return {
    getReports: async (query) => {
      let request = client
        .from("report_with_details")
        .select("*, contractor (*), client (*)");
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
      if (query.filters.contractorId) {
        switch (query.filters.contractorId.operator) {
          case "oneOf":
            request = request.in(
              "contractor_id",
              query.filters.contractorId.value,
            );
            break;
          case "matchNone":
            request = request.not(
              "contractor_id",
              "in",
              query.filters.contractorId.value,
            );
            break;
        }
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

      if (query.filters.remainingAmount) {
        request = numberFilterSupabaseUtils.filterBy(
          request,
          query.filters.remainingAmount,
          "report_billing_balance",
        );
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
      return parseWithDataError(z.array(report$), data).map(
        reportFromHttp,
      );
    },
    getReport: async () => {
      throw new Error("Not implemented");
    },
  };
}
