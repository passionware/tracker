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
import { Contractor } from "@/api/contractor/contractor.api.ts";
import { LinkBillingReport } from "@/api/link-billing-report/link-billing-report.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";

export interface ContractorReport {
  id: number;
  createdAt: string;
  contractorId: number;
  description: string;
  netValue: number;
  periodStart: Date;
  periodEnd: Date;
  currency: string;
  clientId: number;
  linkBillingReport: LinkBillingReport[] | null;
  contractor: Contractor | null;
  workspaceId: number;
}

export type ContractorReportQuery = WithFilters<{
  clientId: Nullable<EnumFilter<Client["id"]>>;
  workspaceId: Nullable<EnumFilter<Workspace["id"]>>;
  remainingAmount: Nullable<NumberFilter>;
  contractorId: Nullable<EnumFilter<Contractor["id"]>>;
}> &
  WithPagination &
  WithSorter<"periodStart" | "periodEnd" | "netValue">;

export interface ContractorReportApi {
  getContractorReports: (
    query: ContractorReportQuery,
  ) => Promise<ContractorReport[]>;
  getContractorReport: (id: number) => Promise<ContractorReport>;
}

export const contractorReportQueryUtils = {
  ...withFiltersUtils<ContractorReportQuery>(),
  ...withPaginationUtils<ContractorReportQuery>(),
  ...withSorterUtils<ContractorReportQuery>(),
  ofDefault: (
    workspaceId: WorkspaceSpec,
    clientId: ClientSpec,
  ): ContractorReportQuery => ({
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
