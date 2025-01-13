import {
  ClientBilling,
  ClientBillingQuery,
} from "@/api/client-billing/client-billing.api.ts";
import {
  ContractorReport,
  ContractorReportQuery,
} from "@/api/contractor-reports/contractor-reports.api.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";
import { Cost, CostQuery } from "@/api/cost/cost.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";

import {
  CurrencyValue,
  CurrencyValueGroup,
} from "@/services/ExchangeService/ExchangeService.ts";
import { Maybe, RemoteData } from "@passionware/monads";

export interface ContractorReportView {
  entries: ContractorReportViewEntry[];
  total: {
    netAmount: CurrencyValueGroup;
    reconciledAmount: CurrencyValueGroup;
    chargedAmount: CurrencyValueGroup;
    toChargeAmount: CurrencyValueGroup;
    compensatedAmount: CurrencyValueGroup;
    toCompensateAmount: CurrencyValueGroup;
    toFullyCompensateAmount: CurrencyValueGroup;
  };
}

export interface ContractorReportViewEntry {
  id: number;
  netAmount: CurrencyValue;
  periodStart: Date;
  periodEnd: Date;
  description: string;
  /**
   * Whether the reported work has been already billed or not.
   */
  status: "billed" | "partially-billed" | "clarified" | "uncovered";
  reconciledAmount: CurrencyValue;
  billedAmount: CurrencyValue;
  remainingAmount: CurrencyValue;
  billingLinks: ContractorReportBillingLinkView[];
  costLinks: ContractorReportCostLinkView[];
  compensationStatus: "compensated" | "partially-compensated" | "uncompensated";
  fullCompensationStatus:
    | "compensated"
    | "partially-compensated"
    | "uncompensated";
  compensatedAmount: CurrencyValue;
  // how much to compensate against money actually charged
  remainingCompensationAmount: CurrencyValue;
  // how much to compensate against reported work value
  remainingFullCompensationAmount: CurrencyValue;

  contractor: Contractor;
  workspace: Workspace;
  clientId: number;
}

export type ContractorReportBillingLinkView = {
  id: number;
  amount: CurrencyValue;
} & (
  | {
      linkType: "clientBilling";
      billing: ClientBilling;
    }
  | {
      linkType: "clarification";
      justification: string;
    }
);

export type ContractorReportCostLinkView = {
  id: number;
  costAmount: CurrencyValue;
  reportAmount: CurrencyValue;
  description: string;
  cost: Cost;
};

export interface ClientBillingView {
  entries: ClientBillingViewEntry[];
  total: {
    netAmount: CurrencyValueGroup;
    grossAmount: CurrencyValueGroup;
    matchedAmount: CurrencyValueGroup;
    remainingAmount: CurrencyValueGroup;
  };
}

export interface ClientBillingViewEntry {
  id: number;
  netAmount: CurrencyValue;
  grossAmount: CurrencyValue;
  invoiceNumber: string;
  clientId: number;
  invoiceDate: Date;
  description: string | null;
  links: ClientBillingLinkView[];
  matchedAmount: CurrencyValue;
  remainingAmount: CurrencyValue;
  /**
   * Whether the billing is fully matched with reports or not yet
   * If unmatched, this means we still did not link all reports to this billing and as such we can't say it is a reliable source of information.
   * If clarified, this means we have some clarifications on this billing, so not everything is linked to reports, but there is a remainder value that has a reason and we no longer look for more reports to link.
   */
  status: "matched" | "unmatched" | "partially-matched" | "clarified";
  workspace: Workspace;
}

export type ClientBillingLinkView =
  | {
      id: number;
      type: "reconcile";
      amount: CurrencyValue;
      contractorReport: ContractorReport;
    }
  | {
      id: number;
      type: "clarify";
      amount: CurrencyValue;
      justification: string;
    };

export type CostLinkView = {
  id: number;
  // how much of the cost is linked
  costAmount: CurrencyValue;
  // what is the equivalent amount in the report
  reportAmount: CurrencyValue;
  description: string;
  contractorReport: ContractorReport;
};

export type CostEntry = {
  id: number;
  createdAt: Date;
  invoiceNumber: Maybe<string>;
  counterparty: Maybe<string>;
  description: Maybe<string>;
  invoiceDate: Date;
  netAmount: CurrencyValue;
  grossAmount: Maybe<CurrencyValue>;
  contractor: Contractor | null;
  // foreign references
  linkReports: CostLinkView[];
  workspace: Workspace;
  /**
   * Status of cost:
   * matched: we have linked all constractor reports to this cost
   * unmatched: we have not linked any contractor reports to this cost
   * partially-matched: we have linked some contractor reports to this cost
   */
  status: "matched" | "unmatched" | "partially-matched"; //| "clarified";
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
  useReportView: (
    query: ContractorReportQuery,
  ) => RemoteData<ContractorReportView>;
  /**
   * Returns a list of billing information, with all links and contractor report information.
   * @param query
   */
  useBillingView: (query: ClientBillingQuery) => RemoteData<ClientBillingView>;
  /**
   * Returns a list of costs, with all links and contractor report information.
   * @param query
   */
  useCostView: (query: CostQuery) => RemoteData<CostView>;
}

export interface WithReportDisplayService {
  reportDisplayService: ReportDisplayService;
}
