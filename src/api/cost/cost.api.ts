import { EnumFilter } from "@/api/_common/query/filters/EnumFilter.ts";
import { paginationUtils } from "@/api/_common/query/pagination.ts";
import {
  WithFilters,
  withFiltersUtils,
  WithPagination,
  withPaginationUtils,
  WithSearch,
  withSearchUtils,
} from "@/api/_common/query/queryUtils.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";
import { LinkCostReport } from "@/api/link-cost-report/link-cost-report.ts";
import { Maybe } from "@passionware/monads";

export interface Cost {
  id: number;
  createdAt: Date;
  invoiceNumber: Maybe<string>;
  counterparty: Maybe<string>;
  description: Maybe<string>;
  invoiceDate: Date;
  netValue: number;
  grossValue: Maybe<number>;
  contractorId: Maybe<Contractor["id"]>;
  currency: string;
  // foreign references
  contractor?: Contractor;
  linkCostReports?: LinkCostReport[];
}

export type CostQuery = WithSearch &
  WithFilters<{
    contractorId: Maybe<EnumFilter<Contractor["id"] | null>>;
  }> &
  WithPagination;

export const costQueryUtils = {
  ...withFiltersUtils<CostQuery>(),
  ...withSearchUtils<CostQuery>(),
  ...withPaginationUtils<CostQuery>(),
  ofDefault: (): CostQuery => ({
    search: "",
    filters: { contractorId: null },
    page: paginationUtils.ofDefault(),
  }),
};

export interface CostApi {
  getCosts: (query: CostQuery) => Promise<Cost[]>;
  getCost: (id: Maybe<Cost["id"]>) => Promise<Cost>;
}
