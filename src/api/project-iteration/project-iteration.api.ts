import { DateFilter } from "@/api/_common/query/filters/DateFilter.ts";
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
  withSorterUtils,
} from "@/api/_common/query/queryUtils.ts";
import { Project } from "@/api/project/project.api.ts";
import { Nullable } from "@/platform/typescript/Nullable";

export interface ProjectIterationPayload {
  periodStart: Date;
  periodEnd: Date;
  status: "draft" | "active" | "closed";
  description: Nullable<string>;
  projectId: Project["id"];
  ordinalNumber: number;
}

export interface ProjectIteration extends ProjectIterationPayload {
  id: number;
  createdAt: Date;
}

export interface ProjectIterationDetail extends ProjectIteration {
  // todo - all iteration nested data goes here (extracted from view)
}

export interface ProjectIterationQuery
  extends WithSearch,
    WithPagination,
    WithFilters<{
      period: DateFilter;
      status: EnumFilter<ProjectIterationPayload["status"]>;
      projectId: EnumFilter<ProjectIterationPayload["projectId"]>;
    }>,
    WithSorter<"periodStart" | "periodEnd" | "status" | "ordinalNumber"> {}

export const projectIterationQueryUtils = withBuilderUtils({
  ...withPaginationUtils<ProjectIterationQuery>(),
  ...withSorterUtils<ProjectIterationQuery>(),
  ...withFiltersUtils<ProjectIterationQuery>(),
  ...withSearchUtils<ProjectIterationQuery>(),
  ofDefault: (): ProjectIterationQuery => ({
    search: "",
    filters: {
      period: null,
      status: null,
      projectId: null,
    },
    page: paginationUtils.ofDefault(),
    sort: null,
  }),
}).setInitialQueryFactory((x) => x.ofDefault);

export interface ProjectIterationApi {
  getProjectIterations: (
    query: ProjectIterationQuery,
  ) => Promise<ProjectIteration[]>;
  getProjectIterationDetail: (id: number) => Promise<ProjectIterationDetail>;
}
