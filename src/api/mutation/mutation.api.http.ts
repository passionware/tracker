import { LinkBillingReportPayload } from "@/api/link-billing-report/link-billing-report.api.ts";
import { MutationApi } from "@/api/mutation/mutation.api.ts";
import { maybe } from "@passionware/monads";
import { SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { pickBy } from "lodash";

export function createMutationApi(client: SupabaseClient): MutationApi {
  const formatDateForSupabase = (date: Date) => format(date, "yyyy-MM-dd");

  function getInsertPayload(payload: LinkBillingReportPayload) {
    switch (payload.linkType) {
      case "clarify":
        return {
          description: payload.description,
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
        cost_id: payload.costId,
        cost_amount: payload.costAmount,
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
    createBilling: async (billing) => {
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
    editBilling: async (billingId, payload) => {
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
    editProject: async (projectId, payload) => {
      const takeIfPresent = <T extends keyof typeof payload>(key: T) =>
        key in payload ? payload[key] : undefined;
      const response = await client
        .from("project")
        .update(
          pickBy(
            {
              name: takeIfPresent("name"),
              description: takeIfPresent("description"),
              client_id: takeIfPresent("clientId"),
              workspace_id: takeIfPresent("workspaceId"),
              status: takeIfPresent("status"),
            },
            (_, key) => key !== undefined,
          ),
        )
        .eq("id", projectId);
      if (response.error) {
        throw response.error;
      }
    },
    updateBillingReportLink: async (linkId, payload) => {
      const takeIfPresent = <T extends keyof typeof payload>(key: T) =>
        key in payload ? payload[key] : undefined;
      const response = await client
        .from("link_billing_report")
        .update(
          pickBy(
            {
              description: takeIfPresent("description"),
              report_id: takeIfPresent("reportId"),
              billing_id: takeIfPresent("billingId"),
              report_amount: takeIfPresent("reportAmount"),
              billing_amount: takeIfPresent("billingAmount"),
            },
            (_, key) => key !== undefined,
          ),
        )
        .eq("id", linkId);
      if (response.error) {
        throw response.error;
      }
    },
    updateCostReportLink: async (linkId, payload) => {
      const takeIfPresent = <T extends keyof typeof payload>(key: T) =>
        key in payload ? payload[key] : undefined;
      const response = await client
        .from("link_cost_report")
        .update(
          pickBy(
            {
              report_id: takeIfPresent("reportId"),
              report_amount: takeIfPresent("reportAmount"),
              cost_id: takeIfPresent("costId"),
              cost_amount: takeIfPresent("costAmount"),
              description: takeIfPresent("description"),
            },
            (_, key) => key !== undefined,
          ),
        )
        .eq("id", linkId);
      if (response.error) {
        throw response.error;
      }
    },
    createProject: async (project) => {
      const response = await client
        .from("project")
        .insert({
          name: project.name,
          description: project.description,
          client_id: project.clientId,
          workspace_id: project.workspaceId,
          status: project.status,
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
    deleteProject: async (projectId) => {
      const response = await client
        .from("project")
        .delete()
        .eq("id", projectId);
      if (response.error) {
        throw response.error;
      }
    },
    createProjectIteration: async (iteration) => {
      const response = await client
        .from("project_iteration")
        .insert({
          project_id: iteration.projectId,
          period_start: iteration.periodStart,
          period_end: iteration.periodEnd,
          status: iteration.status,
          description: iteration.description,
          ordinal_number: iteration.ordinalNumber,
          currency: iteration.currency,
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
    createProjectIterationPosition: async (position) => {
      const response = await client
        .from("project_iteration_position")
        .insert({
          project_iteration_id: position.projectIterationId,
          quantity: position.quantity,
          unit: position.unit,
          unit_price: position.unitPrice,
          description: position.description,
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
    editProjectIteration: async (iterationId, payload) => {
      const takeIfPresent = <T extends keyof typeof payload>(key: T) =>
        key in payload ? payload[key] : undefined;
      const response = await client
        .from("project_iteration")
        .update(
          pickBy(
            {
              project_id: takeIfPresent("projectId"),
              period_start: takeIfPresent("periodStart"),
              period_end: takeIfPresent("periodEnd"),
              status: takeIfPresent("status"),
              description: takeIfPresent("description"),
            },
            (_, key) => key !== undefined,
          ),
        )
        .eq("id", iterationId);
      if (response.error) {
        throw response.error;
      }
    },
    editProjectIterationPosition: async (positionId, payload) => {
      const takeIfPresent = <T extends keyof typeof payload>(key: T) =>
        key in payload ? payload[key] : undefined;
      const response = await client
        .from("project_iteration_position")
        .update(
          pickBy(
            {
              project_iteration_id: takeIfPresent("projectIterationId"),
              quantity: takeIfPresent("quantity"),
              unit: takeIfPresent("unit"),
              unit_price: takeIfPresent("unitPrice"),
              description: takeIfPresent("description"),
            },
            (_, key) => key !== undefined,
          ),
        )
        .eq("id", positionId);
      if (response.error) {
        throw response.error;
      }
    },
    deleteProjectIteration: async (iterationId) => {
      const response = await client
        .from("project_iteration")
        .delete()
        .eq("id", iterationId);
      if (response.error) {
        throw response.error;
      }
    },
    deleteProjectIterationPosition: async (positionId) => {
      const response = await client
        .from("project_iteration_position")
        .delete()
        .eq("id", positionId);
      if (response.error) {
        throw response.error;
      }
    },
  };
}
