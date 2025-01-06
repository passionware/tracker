import { MutationApi } from "@/api/mutation/mutation.api.ts";
import { SupabaseClient } from "@supabase/supabase-js";

export function createMutationApi(client: SupabaseClient): MutationApi {
  return {
    linkReportAndBilling: async (payload) => {
      const response = await client.from("link_billing_report").insert({
        client_billing_id: payload.clientBillingId,
        contractor_report_id: payload.contractorReportId,
        reconcile_amount: payload.reconcileAmount,
      });
      if (response.error) {
        throw response.error;
      }
    },
    clarifyLink: async (payload) => {
      const response = await client.from("link_billing_report").insert({
        clarify_justification: payload.clarifyJustification,
        link_type: "clarify",
        contractor_report_id: payload.contractorReportId,
        reconcile_amount: payload.clarifyAmount,
      });
      if (response.error) {
        throw response.error;
      }
    },
  };
}
