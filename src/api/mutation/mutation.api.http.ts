import { LinkPayload, MutationApi } from "@/api/mutation/mutation.api.ts";
import { SupabaseClient } from "@supabase/supabase-js";

export function createMutationApi(client: SupabaseClient): MutationApi {
  function getInsertPayload(payload: LinkPayload) {
    switch (payload.type) {
      case "clarify":
        return {
          clarify_justification: payload.clarifyJustification,
          link_type: "clarify",
          contractor_report_id: payload.contractorReportId,
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
  };
}
