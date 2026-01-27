import { booleanFilterSupabaseUtils } from "@/api/_common/query/filters/BooleanFilter.supabase.ts";
import { dateFilterSupabaseUtils } from "@/api/_common/query/filters/DateFilter.supabase.ts";
import { enumFilterSupabaseUtils } from "@/api/_common/query/filters/EnumFilter.supabase.ts";
import { numberFilterSupabaseUtils } from "@/api/_common/query/filters/NumberFilter.supabase.ts";
import { sorterSupabaseUtils } from "@/api/_common/query/sorters/Sorter.supabase.ts";
import {
  report$,
  reportFromHttp,
} from "@/api/reports/reports.api.http.schema.ts";
import { parseWithDataError } from "@/platform/zod/parseWithDataError.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ReportApi } from "./reports.api.ts";

export function createReportsApi(client: SupabaseClient): ReportApi {
  return {
    getReports: async (query) => {
      let request = client
        .from("report_with_details")
        .select("*, contractor (*), client (*), workspace (name)");
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
      if (query.filters.id) {
        enumFilterSupabaseUtils.filterBy.oneToMany(
          request,
          query.filters.id,
          "id",
        );
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
      if (query.filters.immediatePaymentDue) {
        request = numberFilterSupabaseUtils.filterBy(
          request,
          query.filters.immediatePaymentDue,
          "report_cost_balance",
        );
      }

      if (query.filters.period) {
        request = dateFilterSupabaseUtils.filterByRangeOverlap(
          request,
          query.filters.period,
          "period_start",
          "period_end",
        );
      }

      if (query.filters.projectIterationId) {
        request = enumFilterSupabaseUtils.filterBy.oneToMany(
          request,
          query.filters.projectIterationId,
          "project_iteration_id",
        );
      }

      if (query.filters.commitState) {
        request = booleanFilterSupabaseUtils.filterBy(
          request,
          query.filters.commitState,
          "is_committed",
        );
      }

      if (query.sort) {
        request = sorterSupabaseUtils.sort(request, query.sort, {
          contractor: "contractor(full_name)",
          netValue: "net_value",
          period: "period_end",
          workspace: "workspace(name)",
          client: "client(name)",
          reportBillingValue: "total_billing_billing_value",
          remainingAmount: "report_billing_balance",
          immediatePaymentDue: "immediate_payment_due",
          reportCostBalance: "report_cost_balance",
        });
      }

      const { data, error } = await request;
      if (error) {
        throw error;
      }
      return parseWithDataError(z.array(report$), data).map(reportFromHttp);
    },
    getReport: async (id) => {
      const { data, error } = await client
        .from("report_with_details")
        .select("*, contractor (*), client (*), workspace (name)")
        .eq("id", id)
        .single();
      if (error) {
        throw error;
      }
      return reportFromHttp(parseWithDataError(report$, data));
    },
  };
}
