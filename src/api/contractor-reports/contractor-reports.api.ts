import { EnumFilter } from "@/api/_common/query/filters/EnumFilter.ts";
import {
  WithFilters,
  withFiltersUtils,
  WithPagination,
  withPaginationUtils,
} from "@/api/_common/query/queryUtils.ts";
import { Client } from "@/api/clients/clients.api.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";

export interface ContractorReport {
  id: number;
  contractorId: string;
  periodStart: Date;
  periodEnd: Date;
  currency: string;
  netValue: number;
  description: string;
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
