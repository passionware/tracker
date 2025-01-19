import { EnumFilter } from "@/api/_common/query/filters/EnumFilter.ts";
import { NumberFilter } from "@/api/_common/query/filters/NumberFilter.ts";
import {
  WithFilters,
  withFiltersUtils,
  WithPagination,
  withPaginationUtils,
  WithSorter,
  withSorterUtils,
} from "@/api/_common/query/queryUtils.ts";
import { ClientBillingBase } from "@/api/client-billing/client-billing.api.ts";
import { Client } from "@/api/clients/clients.api.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";
import { CostBase } from "@/api/cost/cost.api.ts";
import { LinkBillingReport } from "@/api/link-billing-report/link-billing-report.api.ts";
import { LinkCostReport } from "@/api/link-cost-report/link-cost-report.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";

export interface ReportBase {
  id: number;
  createdAt: string;
  contractorId: number;
  periodStart: Date;
  periodEnd: Date;
  clientId: number;
  workspaceId: number;

  description: string;
  netValue: number;

  currency: string;
}

export type Report = ReportBase & {
  contractor: Contractor;
  client: Client;
  linkBillingReport: {
    link: LinkBillingReport;
    billing: Nullable<ClientBillingBase>;
  }[];
  linkCostReport: { link: LinkCostReport; cost: CostBase }[];
  // todo: add billingById, costById - relevant entities in a map
  // Total billing value linked to the report
  reportBillingValue: number; // total_billing_billing_value
  // Remaining report value that should be billed (positive = to bill, negative = overbilled)
  reportBillingBalance: number; // report_billing_balance
  // Total cost value linked to the report
  reportCostValue: number; // total_cost_cost_value
  // Remaining report value that should be costed (positive = to cost, negative = overcosted)
  reportCostBalance: number; // report_cost_balance
  // Difference between billing and cost values (positive = profit, negative = loss)
  billingCostBalance: number; // billing_cost_balance
  // Whether the report has immediate payment due (it is billingCostBalance but clamped to the reported value, if reported value is less than billed value)
  immediatePaymentDue: number; // immediate_payment_due
  previousReport: Nullable<ReportBase>;
};

export type ReportQuery = WithFilters<{
  clientId: Nullable<EnumFilter<Client["id"]>>;
  workspaceId: Nullable<EnumFilter<Workspace["id"]>>;
  remainingAmount: Nullable<NumberFilter>;
  contractorId: Nullable<EnumFilter<Nullable<Contractor["id"]>>>;
}> &
  WithPagination &
  WithSorter<"periodStart" | "periodEnd" | "netValue">;

export interface ReportApi {
  getReports: (query: ReportQuery) => Promise<Report[]>;
  getReport: (id: number) => Promise<Report>;
}

export const reportQueryUtils = {
  ...withFiltersUtils<ReportQuery>(),
  ...withPaginationUtils<ReportQuery>(),
  ...withSorterUtils<ReportQuery>(),
  ofDefault: (
    workspaceId: WorkspaceSpec,
    clientId: ClientSpec,
  ): ReportQuery => ({
    filters: {
      workspaceId: idSpecUtils.mapSpecificOrElse(
        workspaceId,
        (x) => ({
          operator: "oneOf",
          value: [x],
        }),
        null,
      ),
      clientId: idSpecUtils.mapSpecificOrElse(
        clientId,
        (x) => ({
          operator: "oneOf",
          value: [x],
        }),
        null,
      ),
      remainingAmount: null,
      contractorId: null,
    },
    page: { page: 0, pageSize: 10 },
    sort: { field: "periodStart", order: "asc" },
  }),
};
