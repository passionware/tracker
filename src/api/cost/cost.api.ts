import { EnumFilter } from "@/api/_common/query/filters/EnumFilter.ts";
import { NumberFilter } from "@/api/_common/query/filters/NumberFilter.ts";
import { paginationUtils } from "@/api/_common/query/pagination.ts";
import {
  WithFilters,
  withFiltersUtils,
  WithPagination,
  withPaginationUtils,
  WithSearch,
  withSearchUtils,
  WithSorter,
  withSorterUtils,
} from "@/api/_common/query/queryUtils.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";
import { LinkCostReport } from "@/api/link-cost-report/link-cost-report.ts";
import { ReportBase } from "@/api/reports/reports.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { Maybe } from "@passionware/monads";
import { chain } from "lodash";

export interface CostPayload {
  invoiceNumber: Maybe<string>;
  counterparty: Maybe<string>;
  description: Maybe<string>;
  invoiceDate: Date;
  netValue: number;
  grossValue: Maybe<number>;
  contractorId: Maybe<Contractor["id"]>;
  currency: string;
  workspaceId: Workspace["id"];
}

export interface CostBase extends CostPayload {
  id: number;
  createdAt: Date;
}

export interface Cost extends CostBase {
  contractor: Nullable<Contractor>;
  linkReports: { link: LinkCostReport; report: ReportBase }[];
}

export type CostQuery = WithSearch &
  WithFilters<{
    workspaceId: Nullable<EnumFilter<Workspace["id"]>>;
    clientId: Nullable<EnumFilter<Nullable<Contractor["id"]>>>;
    /**
     * We want to see costs that are either linked to the client via contractor report, or linked to contractors that have any report linked to the client
     */
    potentialClientId: Nullable<EnumFilter<Nullable<Contractor["id"]>>>;
    contractorId: Nullable<EnumFilter<Nullable<Contractor["id"]>>>;
    linkedRemainder: Nullable<NumberFilter>;
    linkedAmount: Nullable<NumberFilter>;
  }> &
  WithPagination &
  WithSorter<keyof CostPayload>;

export const costQueryUtils = {
  ...withFiltersUtils<CostQuery>(),
  ...withSorterUtils<CostQuery>(),
  ...withSearchUtils<CostQuery>(),
  ...withPaginationUtils<CostQuery>(),
  ofDefault: (workspaceId: WorkspaceSpec, clientId: ClientSpec): CostQuery =>
    costQueryUtils.ensureDefault(
      {
        search: "",
        filters: {
          workspaceId: null,
          clientId: null,
          contractorId: null,
          linkedRemainder: null,
          linkedAmount: null,
          potentialClientId: null,
        },
        page: paginationUtils.ofDefault(),
        sort: { field: "contractorId", order: "asc" },
      },
      workspaceId,
      clientId,
    ),
  ensureDefault: (
    query: CostQuery,
    workspaceId: WorkspaceSpec,
    clientId: ClientSpec,
  ): CostQuery =>
    chain(query)
      .thru((x) =>
        costQueryUtils.setFilter(
          x,
          "workspaceId",
          idSpecUtils.mapSpecificOrElse(
            workspaceId,
            (x) => ({ operator: "oneOf", value: [x] }),
            null,
          ),
        ),
      )
      .thru((x) =>
        costQueryUtils.setFilter(
          x,
          "clientId",
          idSpecUtils.mapSpecificOrElse(
            clientId,
            (x) => ({ operator: "oneOf", value: [x] }),
            null,
          ),
        ),
      )
      .value(),
};

export interface CostApi {
  getCosts: (query: CostQuery) => Promise<Cost[]>;
  getCost: (id: Maybe<Cost["id"]>) => Promise<Cost>;
}
