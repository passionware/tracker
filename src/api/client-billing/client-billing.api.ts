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
import { Client } from "@/api/clients/clients.api.ts";
import { ReportBase } from "@/api/reports/reports.api.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";

import { LinkBillingReport } from "@/api/link-billing-report/link-billing-report.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { chain } from "lodash";

export interface ClientBillingBase {
  id: number;
  createdAt: Date;
  currency: string;
  totalNet: number;
  totalGross: number;
  clientId: number;
  invoiceNumber: string;
  invoiceDate: Date;
  description: string | null;
  workspaceId: Workspace["id"];
}

export interface ClientBilling extends ClientBillingBase {
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

export type ClientBillingQuery = WithFilters<{
  clientId: Nullable<EnumFilter<Client["id"]>>;
  workspaceId: Nullable<EnumFilter<Workspace["id"]>>;
  remainingAmount: Nullable<NumberFilter>;
  contractorId: Nullable<EnumFilter<Nullable<Contractor["id"]>>>;
}> &
  WithPagination &
  WithSorter<"invoiceDate">;

export const clientBillingQueryUtils = {
  ...withFiltersUtils<ClientBillingQuery>(),
  ...withPaginationUtils<ClientBillingQuery>(),
  ...withSorterUtils<ClientBillingQuery>(),
  ofDefault: (
    workspaceId: WorkspaceSpec,
    clientId: ClientSpec,
  ): ClientBillingQuery =>
    clientBillingQueryUtils.ensureDefault(
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
    query: ClientBillingQuery,
    workspaceId: WorkspaceSpec,
    clientId: ClientSpec,
  ): ClientBillingQuery =>
    chain(query)
      .thru((q) =>
        clientBillingQueryUtils.setFilter(
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
        clientBillingQueryUtils.setFilter(
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
};

export interface ClientBillingApi {
  getClientBillings: (query: ClientBillingQuery) => Promise<ClientBilling[]>;
}
