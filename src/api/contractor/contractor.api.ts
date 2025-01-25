import { EnumFilter } from "@/api/_common/query/filters/EnumFilter.ts";
import { paginationUtils } from "@/api/_common/query/pagination.ts";
import {
  withBuilderUtils,
  WithFilters,
  withFiltersUtils,
  WithPagination,
  withPaginationUtils,
  WithSearch,
  withSearchUtils,
  WithSorter,
} from "@/api/_common/query/queryUtils.ts";

export interface Contractor {
  id: number;
  name: string;
  fullName: string;
  createdAt: Date;
}

export type ContractorQuery = WithSearch &
  WithSorter<"fullName" | "createdAt"> &
  WithFilters<{
    id: EnumFilter<number>;
  }> &
  WithPagination;

export const contractorQueryUtils = withBuilderUtils({
  ...withSearchUtils<ContractorQuery>(),
  ...withFiltersUtils<ContractorQuery>(),
  ...withPaginationUtils<ContractorQuery>(),
  ofEmpty: (): ContractorQuery => ({
    search: "",
    sort: { field: "fullName", order: "asc" },
    page: paginationUtils.ofDefault(),
    filters: { id: null },
  }),
}).setInitialQueryFactory((x) => x.ofEmpty);

export interface ContractorApi {
  getContractors: (query: ContractorQuery) => Promise<Contractor[]>;
  getContractor: (id: Contractor["id"]) => Promise<Contractor>;
}
