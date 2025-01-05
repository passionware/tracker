import { EnumFilter } from "@/api/_common/query/filters/EnumFilter.ts";
import {
  WithFilters,
  withFiltersUtils,
  WithPagination,
  withPaginationUtils,
} from "@/api/_common/query/queryUtils.ts";
import { ClientBilling } from "@/api/client-billing/client-billing.api.ts";
import { Client } from "@/api/clients/clients.api.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
export interface LinkBillingReport {
  id: number;
  createdAt: string;
  clientBillingId: number | null;
  contractorReportId: number | null;
  reconcileAmount: number;
  linkType: "clarify" | null;
  clarifyJustification: string | null;
  clientBilling: ClientBilling | null;
}
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
}

export type ContractorReportQuery = WithFilters<{
  clientId: Nullable<EnumFilter<Client["id"]>>;
}> &
  WithPagination;

export interface ContractorReportApi {
  getContractorReports: (
    query: ContractorReportQuery,
  ) => Promise<ContractorReport[]>;
  getContractorReport: (id: number) => Promise<ContractorReport>;
}

export const contractorReportQueryUtils = {
  ...withFiltersUtils<ContractorReportQuery>(),
  ...withPaginationUtils<ContractorReportQuery>(),
  ofEmpty: (): ContractorReportQuery => ({
    filters: { clientId: null },
    page: { page: 0, pageSize: 10 },
  }),
};
