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
  currency: string;
}

export interface ProjectIteration extends ProjectIterationPayload {
  id: number;
  createdAt: Date;
}

export interface ProjectIterationDetail extends ProjectIteration {
  positions: ProjectIterationPosition[];
  events?: ProjectIterationEvent[];
  // linked reports? somehow we should know that specific work was reported in this iteration, regardless if it was paid or not
}

/**
 * Represents a position in a project iteration. Balance should be 0 at the end of the iteration.
 * Examples:
 * - project cost (also link to costs??) for example part or whole for accountant service
 * - billing for client (also link to billing) ie 160*80eur/h = 12800eur, description "programming services flat rate", unit price 80eur/h, amount 160, unit "hour"
 * - decision to pay for a work (also link to reports) ie 50*115eur/h = 5750eur, description "programming services", unit price 115eur, amount 50, unit "hour"
 * - decision to pay iteration remainder to contractor (also link to reports) ie 10*115eur/h = 1150eur, description "programming services", unit price 115eur, amount 10, unit "hour"
 *
 * Fixed price examples:
 * - fixed billing for client (also link to billing) ie 1*1000eur = 1000eur, description "programming services flat rate", unit price 1000eur, amount 1, unit "iteration"
 * - decision to pay entire hourly work (also link to billing) ie 40*120PLN/h = 4800PLN, description "programming services", unit price 120PLN, amount 40, unit "hour"
 */
export interface ProjectIterationPositionPayload {
  description: string;
  quantity: number;
  unitPrice: number; // price in currency of the project iteration
  unit: string;
  projectIterationId: ProjectIteration["id"];
}
export interface ProjectIterationPosition
  extends ProjectIterationPositionPayload {
  order: number;
  id: number;
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

/**
 * Experimental api - events
 */

type AccountSpec =
  | {
      type: "client";
    }
  | {
      type: "contractor";
      contractorId: number;
    }
  | {
      type: "iteration";
    }
  | {
      type: "cost";
    };

export interface ProjectIterationEvent {
  id: string; // v4
  description: string; // np 'licencja przerzucana na klienta',
  moves: Array<{
    from: AccountSpec;
    to: AccountSpec;
    amount: number;
    unitPrice: number;
  }>;
}
