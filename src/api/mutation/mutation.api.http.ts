import {
  LinkReportBillingPayload,
  MutationApi,
} from "@/api/mutation/mutation.api.ts";
import { SupabaseClient } from "@supabase/supabase-js";

export function createMutationApi(client: SupabaseClient): MutationApi {
  function getInsertPayload(payload: LinkReportBillingPayload) {
    switch (payload.type) {
      case "clarify":
        return {
          clarify_justification: payload.clarifyJustification,
          link_type: "clarify",
          contractor_report_id:
            "contractorReportId" in payload ? payload.contractorReportId : null,
          client_billing_id:
            "clientBillingId" in payload ? payload.clientBillingId : null,
          reconcile_amount: payload.linkAmount,
        };
      case "reconcile":
        return {
          client_billing_id: payload.clientBillingId,
          contractor_report_id: payload.contractorReportId,
          reconcile_amount: payload.linkAmount,
        };
    }
  }

  return {
    linkReportAndBilling: async (payload) => {
      const response = await client
        .from("link_billing_report")
        .insert(getInsertPayload(payload));
      if (response.error) {
        throw response.error;
      }
    },
    linkCostAndReport: async (payload) => {
      const response = await client.from("link_cost_report").insert({
        cost_id: payload.costId,
        contractor_report_id: payload.contractorReportId,
        cost_amount: payload.costAmount,
        report_amount: payload.reportAmount,
        description: payload.description,
      });
      if (response.error) {
        throw response.error;
      }
    },
    createContractorReport: async (report) => {
      const response = await client
        .from("contractor_reports")
        .insert({
          contractor_id: report.contractorId,
          description: report.description,
          net_value: report.netValue,
          period_start: report.periodStart,
          period_end: report.periodEnd,
          currency: report.currency,
          client_id: report.clientId,
          workspace_id: report.workspaceId,
        })
        .select("id");
      if (response.error) {
        throw response.error;
      }
      if (response.data[0]?.id === undefined) {
        throw new Error("No id returned");
      }
      return { id: response.data[0].id };
    },
    deleteBillingReportLink: async (linkId) => {
      const response = await client
        .from("link_billing_report")
        .delete()
        .eq("id", linkId);
      if (response.error) {
        throw response.error;
      }
    },
    deleteCostReportLink: async (linkId) => {
      const response = await client
        .from("link_cost_report")
        .delete()
        .eq("id", linkId);
      if (response.error) {
        throw response.error;
      }
    },
  };
}
