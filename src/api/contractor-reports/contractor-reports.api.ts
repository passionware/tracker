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
import { Contractor } from "@/api/contractor/contractor.api.ts";
import { LinkBillingReport } from "@/api/link-billing-report/link-billing-report.api.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import { ClientSpec } from "@/services/front/RoutingService/RoutingService.ts";

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
  clientId: Nullable<EnumFilter<ClientSpec>>;
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
  ofDefault: (): ContractorReportQuery => ({
    filters: { clientId: null, remainingAmount: null, contractorId: null },
    page: { page: 0, pageSize: 10 },
    sort: { field: "periodStart", order: "asc" },
  }),
};
