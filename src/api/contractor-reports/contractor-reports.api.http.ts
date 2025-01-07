import { numberFilter } from "@/api/_common/query/filters/NumberFilter.ts";
import {
  contractorReport$,
  contractorReportFromHttp,
} from "@/api/contractor-reports/contractor-reports.api.http.schema.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { snakeCase } from "lodash";
import { z } from "zod";
import { ContractorReportApi } from "./contractor-reports.api.ts";

export function createContractorReportsApi(
  client: SupabaseClient,
): ContractorReportApi {
  return {
    getContractorReports: async (query) => {
      let request = client.from("contractor_reports").select(`
      *,
      link_billing_report (
        *,
        client_billing (*)
      ),
      link_cost_report (
        *,
        costs (
          *
        )
      ),
      contractors (*)
    `);
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
      if (query.sort) {
        request = request.order(snakeCase(query.sort.field), {
          ascending: query.sort.order === "asc",
        });
      }

      const { data, error } = await request;
      if (error) {
        throw error;
      }
      return z
        .array(contractorReport$)
        .parse(data)
        .map(contractorReportFromHttp)
        .filter((report) =>
          numberFilter.matches(
            query.filters.remainingAmount,
            report.netValue -
              (report.linkBillingReport?.reduce(
                (acc, link) => acc + (link.linkAmount ?? 0),
                0,
              ) ?? 0),
          ),
        );
    },
    getContractorReport: async (id) => {
      const { data, error } = await client
        .from("clients")
        .select("*")
        .eq("id", id);
      if (error) {
        throw error;
      }
      return contractorReportFromHttp(
        z.array(contractorReport$).parse(data)[0],
      );
    },
  };
}
