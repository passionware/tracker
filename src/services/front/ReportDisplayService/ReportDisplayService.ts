import {
  ClientBilling,
  ClientBillingQuery,
} from "@/api/client-billing/client-billing.api.ts";
import {
  ContractorReport,
  ContractorReportQuery,
} from "@/api/contractor-reports/contractor-reports.api.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { CurrencyValue } from "@/services/CurrencyService/CurrencyService.ts";
import { Maybe, RemoteData } from "@passionware/monads";

export interface ContractorReportView {
  entries: ContractorReportViewEntry[];
  total: {
    netAmount: Maybe<CurrencyValue>;
    reconciledAmount: Maybe<CurrencyValue>;
    chargedAmount: Maybe<CurrencyValue>;
    toChargeAmount: Maybe<CurrencyValue>;
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
  links: ContractorReportLinkView[];
  contractor: Contractor;
  workspace: Workspace;
}

export type ContractorReportLinkView = {
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

export interface ClientBillingView {
  entries: ClientBillingViewEntry[];
  total: {
    netAmount: Maybe<CurrencyValue>;
    grossAmount: Maybe<CurrencyValue>;
    matchedAmount: Maybe<CurrencyValue>;
    remainingAmount: Maybe<CurrencyValue>;
  };
}

export interface ClientBillingViewEntry {
  id: number;
  netAmount: CurrencyValue;
  grossAmount: CurrencyValue;
  invoiceNumber: string;
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
}

export interface WithReportDisplayService {
  reportDisplayService: ReportDisplayService;
}
