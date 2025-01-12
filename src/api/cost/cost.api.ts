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
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
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
  contractor: Contractor | null;
  linkReports: LinkCostReport[];
  workspaceId: Workspace["id"];
}

export type CostQuery = WithSearch &
  WithFilters<{
    workspaceId: Maybe<EnumFilter<Workspace["id"]>>;
    clientId: Maybe<EnumFilter<Contractor["id"]>>;
    contractorId: Maybe<EnumFilter<Contractor["id"] | null>>;
  }> &
  WithPagination;

export const costQueryUtils = {
  ...withFiltersUtils<CostQuery>(),
  ...withSearchUtils<CostQuery>(),
  ...withPaginationUtils<CostQuery>(),
  ofDefault: (workspaceId: WorkspaceSpec, clientId: ClientSpec): CostQuery => ({
    search: "",
    filters: {
      workspaceId: idSpecUtils.mapSpecificOrElse(
        workspaceId,
        (x) => ({ operator: "oneOf", value: [x] }),
        null,
      ),
      clientId: idSpecUtils.mapSpecificOrElse(
        clientId,
        (x) => ({ operator: "oneOf", value: [x] }),
        null,
      ),
      contractorId: null,
    },
    page: paginationUtils.ofDefault(),
  }),
};

export interface CostApi {
  getCosts: (query: CostQuery) => Promise<Cost[]>;
  getCost: (id: Maybe<Cost["id"]>) => Promise<Cost>;
}
