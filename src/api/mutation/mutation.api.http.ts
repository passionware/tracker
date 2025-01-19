import {
  LinkReportBillingPayload,
  MutationApi,
} from "@/api/mutation/mutation.api.ts";
import { maybe } from "@passionware/monads";
import { SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { pickBy } from "lodash";

export function createMutationApi(client: SupabaseClient): MutationApi {
  const formatDateForSupabase = (date: Date) => format(date, "yyyy-MM-dd");

  function getInsertPayload(payload: LinkReportBillingPayload) {
    switch (payload.type) {
      case "clarify":
        return {
          description: payload.description,
          link_type: "clarify",
          report_id: "reportId" in payload ? payload.reportId : null,
          billing_id: "billingId" in payload ? payload.billingId : null,
          report_amount:
            "reportAmount" in payload ? payload.reportAmount : null,
          billing_amount:
            "billingAmount" in payload ? payload.billingAmount : null,
        };
      case "reconcile":
        return {
          billing_id: payload.billingId,
          report_id: payload.reportId,
          report_amount: payload.reportAmount,
          billing_amount: payload.billingAmount,
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
        report_id: payload.reportId,
        report_amount: payload.reportAmount,
        cost_id: payload.type === "link" ? payload.costId : null,
        cost_amount: payload.type === "link" ? payload.costAmount : 0,
        description: payload.description,
      });
      if (response.error) {
        throw response.error;
      }
    },
    createReport: async (report) => {
      const response = await client
        .from("report")
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
    createClientBilling: async (billing) => {
      const response = await client
        .from("billing")
        .insert({
          total_net: billing.totalNet,
          currency: billing.currency,
          total_gross: billing.totalGross,
          client_id: billing.clientId,
          invoice_number: billing.invoiceNumber,
          invoice_date: billing.invoiceDate,
          description: billing.description,
          workspace_id: billing.workspaceId,
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
    createCost: async (cost) => {
      const response = await client
        .from("cost")
        .insert({
          invoice_number: cost.invoiceNumber,
          counterparty: cost.counterparty,
          contractor_id: cost.contractorId,
          description: cost.description,
          invoice_date: cost.invoiceDate,
          net_value: cost.netValue,
          gross_value: cost.grossValue,
          currency: cost.currency,
          workspace_id: cost.workspaceId,
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
    deleteCostReport: async (reportId) => {
      const response = await client.from("report").delete().eq("id", reportId);
      if (response.error) {
        throw response.error;
      }
    },
    deleteBilling: async (billingId) => {
      const response = await client
        .from("billing")
        .delete()
        .eq("id", billingId);
      if (response.error) {
        throw response.error;
      }
    },
    deleteCost: async (costId) => {
      const response = await client.from("cost").delete().eq("id", costId);
      if (response.error) {
        throw response.error;
      }
    },
    editCost: async (costId, payload) => {
      const takeIfPresent = <T extends keyof typeof payload>(key: T) =>
        key in payload ? payload[key] : undefined;
      const response = await client
        .from("cost")
        .update(
          pickBy(
            {
              invoice_number: takeIfPresent("invoiceNumber"),
              counterparty: takeIfPresent("counterparty"),
              contractor_id: takeIfPresent("contractorId"),
              description: takeIfPresent("description"),
              invoice_date: takeIfPresent("invoiceDate"),
              net_value: takeIfPresent("netValue"),
              gross_value: takeIfPresent("grossValue"),
              currency: takeIfPresent("currency"),
              workspace_id: takeIfPresent("workspaceId"),
            },
            (_, key) => key !== undefined,
          ),
        )
        .eq("id", costId);
      if (response.error) {
        throw response.error;
      }
    },
    editClientBilling: async (billingId, payload) => {
      const takeIfPresent = <T extends keyof typeof payload>(key: T) =>
        key in payload ? payload[key] : undefined;
      const response = await client

        .from("billing")
        .update(
          pickBy(
            {
              total_net: takeIfPresent("totalNet"),
              currency: takeIfPresent("currency"),
              total_gross: takeIfPresent("totalGross"),
              client_id: takeIfPresent("clientId"),
              invoice_number: takeIfPresent("invoiceNumber"),
              invoice_date: takeIfPresent("invoiceDate"),
              description: takeIfPresent("description"),
              workspace_id: takeIfPresent("workspaceId"),
            },
            (_, key) => key !== undefined,
          ),
        )
        .eq("id", billingId);
      if (response.error) {
        throw response.error;
      }
    },
    editReport: async (reportId, payload) => {
      const takeIfPresent = <T extends keyof typeof payload>(key: T) =>
        key in payload ? payload[key] : undefined;
      const response = await client
        .from("report")
        .update(
          pickBy(
            {
              contractor_id: takeIfPresent("contractorId"),
              description: takeIfPresent("description"),
              net_value: takeIfPresent("netValue"),
              period_start: maybe.map(
                takeIfPresent("periodStart"),
                formatDateForSupabase,
              ),
              period_end: maybe.map(
                takeIfPresent("periodEnd"),
                formatDateForSupabase,
              ),
              currency: takeIfPresent("currency"),
              client_id: takeIfPresent("clientId"),
              workspace_id: takeIfPresent("workspaceId"),
            },
            (_, key) => key !== undefined,
          ),
        )
        .eq("id", reportId);
      if (response.error) {
        throw response.error;
      }
    },
  };
}
