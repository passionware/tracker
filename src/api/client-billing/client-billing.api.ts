import { EnumFilter } from "@/api/_common/query/filters/EnumFilter.ts";
import { NumberFilter } from "@/api/_common/query/filters/NumberFilter.ts";
import {
  WithFilters,
  withFiltersUtils,
  WithPagination,
  withPaginationUtils,
  WithSorter,
  withSorterUtils,
} from "@/api/_common/query/queryUtils.ts";
import { Client } from "@/api/clients/clients.api.ts";

import { LinkBillingReport } from "@/api/link-billing-report/link-billing-report.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";
import {
  ClientSpec,
  routingUtils,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";

export interface ClientBilling {
  id: number;
  createdAt: Date;
  currency: string;
  totalNet: number;
  totalGross: number;
  clientId: number;
  invoiceNumber: string;
  invoiceDate: Date;
  description: string | null;
  client: Client | null;
  linkBillingReport: LinkBillingReport[] | null;
  workspaceId: Workspace["id"];
}

export type ClientBillingQuery = WithFilters<{
  clientId: Nullable<EnumFilter<Client["id"]>>;
  workspaceId: Nullable<EnumFilter<Workspace["id"]>>;
  remainingAmount: Nullable<NumberFilter>;
}> &
  WithPagination &
  WithSorter<"invoiceDate">;

export const clientBillingQueryUtils = {
  ...withFiltersUtils<ClientBillingQuery>(),
  ...withPaginationUtils<ClientBillingQuery>(),
  ...withSorterUtils<ClientBillingQuery>(),
  ofDefault: (
    workspaceId: WorkspaceSpec,
    clientId: ClientSpec,
  ): ClientBillingQuery => ({
    filters: {
      clientId: routingUtils.client.mapSpecificOrElse(
        clientId,
        (x) => ({ operator: "oneOf", value: [x] }),
        null,
      ),
      workspaceId: routingUtils.workspace.mapSpecificOrElse(
        workspaceId,
        (x) => ({ operator: "oneOf", value: [x] }),
        null,
      ),
      remainingAmount: null,
    },
    page: { page: 0, pageSize: 10 },
    sort: { field: "invoiceDate", order: "asc" },
  }),
};

export interface ClientBillingApi {
  getClientBillings: (query: ClientBillingQuery) => Promise<ClientBilling[]>;
}
