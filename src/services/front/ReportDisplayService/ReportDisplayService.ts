import { Billing, BillingQuery } from "@/api/billing/billing.api.ts";
import { Client } from "@/api/clients/clients.api.ts";
import { ContractorBase } from "@/api/contractor/contractor.api.ts";
import { Cost, CostQuery } from "@/api/cost/cost.api.ts";
import { Report, ReportQuery } from "@/api/reports/reports.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { Nullable } from "@/platform/typescript/Nullable.ts";

import {
  CurrencyValue,
  CurrencyValueGroup,
} from "@/services/ExchangeService/ExchangeService.ts";
import { CalendarDate } from "@internationalized/date";
import { Maybe, RemoteData } from "@passionware/monads";

export interface ReportView {
  entries: ReportViewEntry[];
  total: {
    netAmount: CurrencyValueGroup;
    billedAmount: CurrencyValueGroup;
    chargedAmount: CurrencyValueGroup;
    toChargeAmount: CurrencyValueGroup;
    compensatedAmount: CurrencyValueGroup;
    toCompensateAmount: CurrencyValueGroup;
    toFullyCompensateAmount: CurrencyValueGroup;
  };
}

export interface ReportViewEntry {
  originalReport: Report;
  id: number;
  netAmount: CurrencyValue;
  periodStart: CalendarDate;
  periodEnd: CalendarDate;
  description: string;
  /**
   * Whether the reported work has been already billed or not.
   */
  status: "billed" | "partially-billed" | "clarified" | "uncovered";
  billedAmount: CurrencyValue;
  remainingAmount: CurrencyValue;
  billingLinks: Report["linkBillingReport"];
  costLinks: Report["linkCostReport"];
  instantEarnings:
    | "compensated"
    | "partially-compensated"
    | "uncompensated"
    | "clarified";
  deferredEarnings: "compensated" | "partially-compensated" | "uncompensated";
  compensatedAmount: CurrencyValue;
  // how much to compensate against money actually charged
  remainingCompensationAmount: CurrencyValue;
  // how much to compensate against reported work value
  remainingFullCompensationAmount: CurrencyValue;

  contractor: ContractorBase;
  workspace: Workspace;
  client: Client;
  previousReportInfo: Nullable<{
    adjacency: "overlaps" | "adjacent" | "separated";
  }>;
}

export interface BillingView {
  entries: BillingViewEntry[];
  total: {
    netAmount: CurrencyValueGroup;
    grossAmount: CurrencyValueGroup;
    matchedAmount: CurrencyValueGroup;
    remainingAmount: CurrencyValueGroup;
  };
}

export interface BillingViewEntry {
  originalBilling: Billing;
  id: number;
  netAmount: CurrencyValue;
  grossAmount: CurrencyValue;
  contractors: ContractorBase[];
  invoiceNumber: string;
  client: Client;
  invoiceDate: CalendarDate;
  description: string | null;
  links: Billing["linkBillingReport"];
  matchedAmount: CurrencyValue;
  remainingAmount: CurrencyValue;
  /**
   * Whether the billing is fully matched with reports or not yet
   * If unmatched, this means we still did not link all reports to this billing and as such we can't say it is a reliable source of information.
   * If clarified, this means we have some clarifications on this billing, so not everything is linked to reports, but there is a remainder value that has a reason and we no longer look for more reports to link.
   */
  status:
    | "matched"
    | "unmatched"
    | "partially-matched"
    | "clarified"
    | "overmatched";
  workspace: Workspace;
}

export type CostEntry = {
  originalCost: Cost;
  id: number;
  createdAt: Date;
  invoiceNumber: Maybe<string>;
  counterparty: Maybe<string>;
  description: Maybe<string>;
  invoiceDate: CalendarDate;
  netAmount: CurrencyValue;
  grossAmount: Maybe<CurrencyValue>;
  contractor: ContractorBase | null;
  // foreign references
  linkReports: Cost["linkReports"];
  workspace: Workspace;
  /**
   * Status of cost:
   * matched: we have linked all constractor reports to this cost
   * unmatched: we have not linked any contractor reports to this cost
   * partially-matched: we have linked some contractor reports to this cost
   * overmatched: billing value is less than the sum of report link's billing values
   * This can happen when we put too much reports to one cost
   */
  status: "matched" | "unmatched" | "partially-matched" | "overmatched";
  matchedAmount: CurrencyValue;
  remainingAmount: CurrencyValue;
};

export type CostView = {
  entries: CostEntry[];
  total: {
    netAmount: CurrencyValueGroup; // each for each currency
    matchedAmount: CurrencyValueGroup; // each for each currency
    remainingAmount: CurrencyValueGroup; // each for each currency
  };
};

export interface ReportDisplayService {
  /**
   * Returns a list of reports, with all links and billing information.
   */
  useReportView: (query: ReportQuery) => RemoteData<ReportView>;
  /**
   * Returns a list of billing information, with all links and contractor report information.
   * @param query
   */
  useBillingView: (query: BillingQuery) => RemoteData<BillingView>;
  /**
   * Returns a list of costs, with all links and contractor report information.
   * @param query
   */
  useCostView: (query: CostQuery) => RemoteData<CostView>;
}

export interface WithReportDisplayService {
  reportDisplayService: ReportDisplayService;
}
