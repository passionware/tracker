import { DateFilter } from "@/api/_common/query/filters/DateFilter.ts";
import { EnumFilter } from "@/api/_common/query/filters/EnumFilter.ts";
import { NumberFilter } from "@/api/_common/query/filters/NumberFilter.ts";
import {
  withBuilderUtils,
  WithFilters,
  withFiltersUtils,
  WithPagination,
  withPaginationUtils,
  WithSorter,
  withSorterUtils,
} from "@/api/_common/query/queryUtils.ts";
import { BillingBase } from "@/api/billing/billing.api.ts";
import { Client } from "@/api/clients/clients.api.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";
import { CostBase } from "@/api/cost/cost.api.ts";
import { LinkBillingReport } from "@/api/link-billing-report/link-billing-report.api.ts";
import { LinkCostReport } from "@/api/link-cost-report/link-cost-report.ts";
import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import { ExpressionContext } from "@/services/front/ExpressionService/ExpressionService.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { chain } from "lodash";

export interface ReportPayload {
  contractorId: number;
  periodStart: Date;
  periodEnd: Date;
  clientId: number;
  workspaceId: number;

  description: string;
  netValue: number;

  currency: string;

  projectIterationId: Nullable<ProjectIteration["id"]>;
}

export interface ReportBase extends ReportPayload {
  id: number;
  createdAt: string;
}

export type Report = ReportBase & {
  contractor: Contractor;
  client: Client;
  linkBillingReport: {
    link: LinkBillingReport;
    billing: Nullable<BillingBase>;
  }[];
  linkCostReport: { link: LinkCostReport; cost: Nullable<CostBase> }[];
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
  period: Nullable<DateFilter>;
  immediatePaymentDue: Nullable<NumberFilter>;
  projectIterationId: Nullable<EnumFilter<Nullable<ProjectIteration["id"]>>>;
}> &
  WithPagination &
  WithSorter<
    | "period"
    | "netValue"
    | "contractor"
    | "workspace"
    | "client"
    | "reportBillingValue"
    | "remainingAmount"
    | "immediatePaymentDue"
    | "reportCostBalance"
    | "description"
  >;

export interface ReportApi {
  getReports: (query: ReportQuery) => Promise<Report[]>;
  getReport: (id: number) => Promise<Report>;
}

export const reportQueryUtils = withBuilderUtils({
  ...withFiltersUtils<ReportQuery>(),
  ...withPaginationUtils<ReportQuery>(),
  ...withSorterUtils<ReportQuery>(),
  ofDefault: (workspaceId: WorkspaceSpec, clientId: ClientSpec): ReportQuery =>
    reportQueryUtils.ensureDefault(
      {
        filters: {
          workspaceId: null,
          clientId: null,
          remainingAmount: null,
          contractorId: null,
          period: null,
          immediatePaymentDue: null,
          projectIterationId: null,
        },
        page: { page: 0, pageSize: 10 },
        sort: { field: "period", order: "asc" },
      },
      workspaceId,
      clientId,
    ),
  ensureDefault: (
    query: ReportQuery,
    workspaceId: WorkspaceSpec,
    clientId: ClientSpec,
  ): ReportQuery => ({
    ...query,
    filters: {
      ...query.filters,
      workspaceId: idSpecUtils.mapSpecificOrElse(
        workspaceId,
        (x) => ({
          operator: "oneOf",
          value: [x],
        }),
        query.filters.workspaceId,
      ),
      clientId: idSpecUtils.mapSpecificOrElse(
        clientId,
        (x) => ({
          operator: "oneOf",
          value: [x],
        }),
        query.filters.clientId,
      ),
    },
  }),
  narrowContext: (
    query: ReportQuery,
    context: ExpressionContext,
  ): ReportQuery =>
    chain(query)
      .thru((x) =>
        idSpecUtils.isAll(context.workspaceId)
          ? x
          : reportQueryUtils.setFilter(x, "workspaceId", {
              operator: "oneOf",
              value: [context.workspaceId],
            }),
      )
      .thru((x) =>
        idSpecUtils.isAll(context.clientId)
          ? x
          : reportQueryUtils.setFilter(x, "clientId", {
              operator: "oneOf",
              value: [context.clientId],
            }),
      )
      .thru((x) =>
        idSpecUtils.isAll(context.contractorId)
          ? x
          : reportQueryUtils.setFilter(x, "contractorId", {
              operator: "oneOf",
              value: [context.contractorId],
            }),
      )
      .value(),
}).setInitialQueryFactory((api) => api.ofDefault);
