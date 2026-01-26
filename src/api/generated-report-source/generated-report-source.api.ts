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
import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { GenericReport } from "@/services/io/_common/GenericReport";

export interface GeneratedReportSourcePayload {
  projectIterationId: ProjectIteration["id"];
  data: GenericReport;
  originalData: unknown;
}

export interface GeneratedReportSource extends GeneratedReportSourcePayload {
  id: number;
  createdAt: Date;
}

export interface GeneratedReportSourceQuery
  extends WithSearch,
    WithPagination,
    WithFilters<{
      createdAt: DateFilter;
      projectIterationId: EnumFilter<
        GeneratedReportSourcePayload["projectIterationId"]
      >;
    }>,
    WithSorter<"createdAt" | "projectIterationId"> {}

export const generatedReportSourceQueryUtils = withBuilderUtils({
  ...withPaginationUtils<GeneratedReportSourceQuery>(),
  ...withSorterUtils<GeneratedReportSourceQuery>(),
  ...withFiltersUtils<GeneratedReportSourceQuery>(),
  ...withSearchUtils<GeneratedReportSourceQuery>(),
  ofDefault: (): GeneratedReportSourceQuery => ({
    search: "",
    filters: {
      createdAt: null,
      projectIterationId: null,
    },
    page: paginationUtils.ofDefault(),
    sort: { field: "createdAt", order: "desc" },
  }),
}).setInitialQueryFactory((x) => x.ofDefault);

export interface GeneratedReportSourceApi {
  getGeneratedReportSources: (
    query: GeneratedReportSourceQuery,
  ) => Promise<GeneratedReportSource[]>;
  getGeneratedReportSource: (id: number) => Promise<GeneratedReportSource>;
  createGeneratedReportSource: (
    payload: GeneratedReportSourcePayload,
  ) => Promise<GeneratedReportSource>;
  updateGeneratedReportSource: (
    id: number,
    payload: Partial<GeneratedReportSourcePayload>,
  ) => Promise<GeneratedReportSource>;
  deleteGeneratedReportSource: (id: number) => Promise<void>;
}
