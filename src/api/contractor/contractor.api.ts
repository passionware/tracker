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
import { Project } from "@/api/project/project.api.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";

export interface Contractor {
  id: number;
  name: string;
  fullName: string;
  createdAt: Date;
  projectIds: Project["id"][];
}

export type ContractorQuery = WithSearch &
  WithSorter<"fullName" | "createdAt"> &
  WithFilters<{
    id: EnumFilter<number>;
    projectId: EnumFilter<Nullable<Project["id"]>>;
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
    filters: { id: null, projectId: null },
  }),
}).setInitialQueryFactory((x) => x.ofEmpty);

export interface ContractorApi {
  getContractors: (query: ContractorQuery) => Promise<Contractor[]>;
  getContractor: (id: Contractor["id"]) => Promise<Contractor>;
}
