import { LinkBillingReportPayload } from "@/api/link-billing-report/link-billing-report.api.ts";
import { MutationApi } from "@/api/mutation/mutation.api.ts";
import { CalendarDate } from "@internationalized/date";
import { maybe } from "@passionware/monads";
import { SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { pickBy } from "lodash";

export function createMutationApi(client: SupabaseClient): MutationApi {
  const formatDateForSupabase = (date: Date | CalendarDate) => {
    if (date instanceof CalendarDate) {
      return date.toString();
    }
    return format(date, "yyyy-MM-dd");
  };

  function getInsertPayload(payload: LinkBillingReportPayload) {
    const basePayload = (() => {
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
    })();

    // Add breakdown fields if present
    if (payload.breakdown) {
      return {
        ...basePayload,
        d_quantity: payload.breakdown.quantity,
        d_unit: payload.breakdown.unit,
        d_report_unit_price: payload.breakdown.reportUnitPrice,
        d_billing_unit_price: payload.breakdown.billingUnitPrice,
        d_report_currency: payload.breakdown.reportCurrency,
        d_billing_currency: payload.breakdown.billingCurrency,
        d_exchange_rate: payload.breakdown.exchangeRate,
      };
    }

    return basePayload;
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
      const insertPayload: any = {
        report_id: payload.reportId,
        report_amount: payload.reportAmount,
        cost_id: payload.costId,
        cost_amount: payload.costAmount,
        description: payload.description,
      };

      // Add breakdown fields if present
      if (payload.breakdown) {
        insertPayload.d_quantity = payload.breakdown.quantity;
        insertPayload.d_unit = payload.breakdown.unit;
        insertPayload.d_report_unit_price = payload.breakdown.reportUnitPrice;
        insertPayload.d_cost_unit_price = payload.breakdown.costUnitPrice;
        insertPayload.d_exchange_rate = payload.breakdown.exchangeRate;
        insertPayload.d_report_currency = payload.breakdown.reportCurrency;
        insertPayload.d_cost_currency = payload.breakdown.costCurrency;
      }

      const response = await client
        .from("link_cost_report")
        .insert(insertPayload);
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
          period_start: formatDateForSupabase(report.periodStart),
          period_end: formatDateForSupabase(report.periodEnd),
          currency: report.currency,
          client_id: report.clientId,
          workspace_id: report.workspaceId,
          // Optional breakdown fields
          d_unit: report.unit,
          d_quantity: report.quantity,
          d_unit_price: report.unitPrice,
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
          invoice_date: formatDateForSupabase(billing.invoiceDate),
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
          invoice_date: formatDateForSupabase(cost.invoiceDate),
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
              invoice_date: maybe.map(
                takeIfPresent("invoiceDate"),
                formatDateForSupabase,
              ),
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
              invoice_date: maybe.map(
                takeIfPresent("invoiceDate"),
                formatDateForSupabase,
              ),
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
              project_iteration_id: takeIfPresent("projectIterationId"),
              // New breakdown fields (database columns: d_unit, d_quantity, d_unit_price)
              d_unit: takeIfPresent("unit"),
              d_quantity: takeIfPresent("quantity"),
              d_unit_price: takeIfPresent("unitPrice"),
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

      // Use Supabase function for atomic transaction
      const { error } = await client.rpc("edit_project_with_workspaces", {
        p_project_id: projectId,
        p_name: takeIfPresent("name"),
        p_description: takeIfPresent("description"),
        p_client_id: takeIfPresent("clientId"),
        p_status: takeIfPresent("status"),
        p_workspace_ids: takeIfPresent("workspaceIds"),
      });

      if (error) {
        throw error;
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
              // Breakdown fields
              d_quantity: payload.breakdown?.quantity,
              d_unit: payload.breakdown?.unit,
              d_report_unit_price: payload.breakdown?.reportUnitPrice,
              d_billing_unit_price: payload.breakdown?.billingUnitPrice,
              d_report_currency: payload.breakdown?.reportCurrency,
              d_billing_currency: payload.breakdown?.billingCurrency,
              d_exchange_rate: payload.breakdown?.exchangeRate,
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
              // Breakdown fields
              d_quantity: payload.breakdown?.quantity,
              d_unit: payload.breakdown?.unit,
              d_report_unit_price: payload.breakdown?.reportUnitPrice,
              d_cost_unit_price: payload.breakdown?.costUnitPrice,
              d_exchange_rate: payload.breakdown?.exchangeRate,
              d_report_currency: payload.breakdown?.reportCurrency,
              d_cost_currency: payload.breakdown?.costCurrency,
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
      // Use Supabase function for atomic transaction
      const { data, error } = await client.rpc(
        "create_project_with_workspaces",
        {
          p_name: project.name,
          p_description: project.description,
          p_client_id: project.clientId,
          p_status: project.status,
          p_workspace_ids: project.workspaceIds,
        },
      );

      if (error) {
        throw error;
      }

      if (data === null || data === undefined) {
        throw new Error("No project ID returned");
      }

      return { id: data };
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
          period_start: formatDateForSupabase(iteration.periodStart),
          period_end: formatDateForSupabase(iteration.periodEnd),
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
              period_start: maybe.map(
                takeIfPresent("periodStart"),
                formatDateForSupabase,
              ),
              period_end: maybe.map(
                takeIfPresent("periodEnd"),
                formatDateForSupabase,
              ),
              status: takeIfPresent("status"),
              description: takeIfPresent("description"),
              ordinal_number: takeIfPresent("ordinalNumber"),
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
    addContractorToProject: async (projectId, contractorId) => {
      const response = await client.from("link_contractor_project").insert({
        project_id: projectId,
        contractor_id: contractorId,
      });
      if (response.error) {
        throw response.error;
      }
    },
    unassignContractorFromProject: async (projectId, contractorId) => {
      const response = await client
        .from("link_contractor_project")
        .delete()
        .eq("project_id", projectId)
        .eq("contractor_id", contractorId);
      if (response.error) {
        throw response.error;
      }
    },
  };
}
