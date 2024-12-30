import { EnumFilter } from "@/api/_common/query/filters/EnumFilter.ts";
import { WithFilters } from "@/api/_common/query/queryUtils.ts";
import { Maybe } from "@passionware/monads";

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
  clientId: Maybe<EnumFilter<string>>;
}>;

export interface ContractorReportApi {
  getContractorReports: (
    query: ContractorReportQuery,
  ) => Promise<ContractorReport[]>;
  getContractorReport: (id: number) => Promise<ContractorReport>;
}
