import { EnumFilter } from "@/api/_common/query/filters/EnumFilter.ts";
import {
  WithFilters,
  withFiltersUtils,
  WithPagination,
  withPaginationUtils,
} from "@/api/_common/query/queryUtils.ts";
import { Client } from "@/api/clients/clients.api.ts";

import { LinkBillingReport } from "@/api/link-billing-report/link-billing-report.api.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";

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
}

export type ClientBillingQuery = WithFilters<{
  clientId: Nullable<EnumFilter<Client["id"]>>;
}> &
  WithPagination;

export const billingQueryUtils = {
  ...withFiltersUtils<ClientBillingQuery>(),
  ...withPaginationUtils<ClientBillingQuery>(),
  ofEmpty: (): ClientBillingQuery => ({
    filters: { clientId: null },
    page: { page: 0, pageSize: 10 },
  }),
};

export interface ClientBillingApi {
  getClientBillings: (query: ClientBillingQuery) => Promise<ClientBilling[]>;
}
