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
import { Client } from "@/api/clients/clients.api.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";

import { LinkBillingReport } from "@/api/link-billing-report/link-billing-report.api.ts";
import { ReportBase } from "@/api/reports/reports.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import { ExpressionContext } from "@/services/front/ExpressionService/ExpressionService.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { chain } from "lodash";

export interface BillingPayload {
  currency: string;
  totalNet: number;
  totalGross: number;
  clientId: number;
  invoiceNumber: string;
  invoiceDate: Date;
  description: string | null;
  workspaceId: Workspace["id"];
}

export interface BillingBase extends BillingPayload {
  id: number;
  createdAt: Date;
}

export interface Billing extends BillingBase {
  // how much of billing value is already linked to reports
  billingReportValue: number;
  //contractors are present in the sql view
  // how much billing is actually linked to reports
  // ie. billing of 6000eur is currently linked to reports of sum 4000eur
  totalBillingValue: number;
  // how much of billing is still not linked to reports
  billingBalance: number;
  // difference between billed amount and report amount
  remainingBalance: number;
  client: Client;
  linkBillingReport: {
    link: LinkBillingReport;
    report: ReportBase;
  }[];
  contractors: Contractor[];
}

export type BillingQuery = WithFilters<{
  clientId: Nullable<EnumFilter<Client["id"]>>;
  workspaceId: Nullable<EnumFilter<Workspace["id"]>>;
  remainingAmount: Nullable<NumberFilter>;
  contractorId: Nullable<EnumFilter<Nullable<Contractor["id"]>>>;
}> &
  WithPagination &
  WithSorter<
    | "invoiceDate"
    | "invoiceNumber"
    | "workspace"
    | "client"
    | "totalNet"
    | "totalGross"
    | "billingReportValue"
    | "totalBillingValue"
    | "billingBalance"
    | "remainingBalance"
    | "description"
  >;

export const billingQueryUtils = withBuilderUtils({
  ...withFiltersUtils<BillingQuery>(),
  ...withPaginationUtils<BillingQuery>(),
  ...withSorterUtils<BillingQuery>(),
  ofDefault: (workspaceId: WorkspaceSpec, clientId: ClientSpec): BillingQuery =>
    billingQueryUtils.ensureDefault(
      {
        filters: {
          clientId: null,
          workspaceId: null,
          remainingAmount: null,
          contractorId: null,
        },
        page: { page: 0, pageSize: 10 },
        sort: { field: "invoiceDate", order: "asc" },
      },
      workspaceId,
      clientId,
    ),
  ensureDefault: (
    query: BillingQuery,
    workspaceId: WorkspaceSpec,
    clientId: ClientSpec,
  ): BillingQuery =>
    chain(query)
      .thru((q) =>
        billingQueryUtils.setFilter(
          q,
          "workspaceId",
          idSpecUtils.mapSpecificOrElse(
            workspaceId,
            (x) => ({ operator: "oneOf", value: [x] }),
            null,
          ),
        ),
      )
      .thru((q) =>
        billingQueryUtils.setFilter(
          q,
          "clientId",
          idSpecUtils.mapSpecificOrElse(
            clientId,
            (x) => ({ operator: "oneOf", value: [x] }),
            null,
          ),
        ),
      )
      .value(),
  // todo candidate for promotion
  narrowContext: (
    query: BillingQuery,
    context: Omit<ExpressionContext, "contractorId">,
  ): BillingQuery =>
    chain(query)
      .thru((x) =>
        idSpecUtils.isAll(context.workspaceId)
          ? x
          : billingQueryUtils.setFilter(x, "workspaceId", {
              operator: "oneOf",
              value: [context.workspaceId],
            }),
      )
      .thru((x) =>
        idSpecUtils.isAll(context.clientId)
          ? x
          : billingQueryUtils.setFilter(x, "clientId", {
              operator: "oneOf",
              value: [context.clientId],
            }),
      )
      .value(),
}).setInitialQueryFactory((api) => api.ofDefault);

export interface BillingApi {
  getBillings: (query: BillingQuery) => Promise<Billing[]>;
}
