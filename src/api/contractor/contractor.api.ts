import { paginationUtils } from "@/api/_common/query/pagination.ts";
import {
  WithPagination,
  withPaginationUtils,
  WithSearch,
  withSearchUtils,
  WithSorter,
  withSorterUtils,
} from "@/api/_common/query/queryUtils.ts";

export interface Contractor {
  id: number;
  name: string;
  fullName: string;
  createdAt: Date;
}

export type ContractorQuery = WithSearch &
  WithSorter<"fullName" | "createdAt"> &
  WithPagination;

export const contractorQueryUtils = {
  ...withSearchUtils<ContractorQuery>(),
  ...withSorterUtils<ContractorQuery>(),
  ...withPaginationUtils<ContractorQuery>(),
  ofEmpty: (): ContractorQuery => ({
    search: "",
    sort: null,
    page: paginationUtils.ofDefault(),
  }),
};

export interface ContractorApi {
  getContractors: (query: ContractorQuery) => Promise<Contractor[]>;
  getContractor: (id: Contractor["id"]) => Promise<Contractor>;
}
