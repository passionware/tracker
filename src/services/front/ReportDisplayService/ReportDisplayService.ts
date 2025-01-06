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
import { RemoteData } from "@passionware/monads";

export interface ContractorReportView {
  id: number;
  netAmount: CurrencyValue;
  periodStart: Date;
  periodEnd: Date;
  description: string;
  /**
   * Whether the reported work has been already billed or not.
   */
  status: "billed" | "clarified" | "uncovered";
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
   */
  status: "matched" | "unmatched";
  workspace: Workspace;
}

export interface ClientBillingLinkView {
  id: number;
  amount: CurrencyValue;
  contractorReport: ContractorReport;
}

export interface ReportDisplayService {
  /**
   * Returns a list of reports, with all links and billing information.
   */
  useReportView: (
    query: ContractorReportQuery,
  ) => RemoteData<ContractorReportView[]>;
  /**
   * Returns a list of billing information, with all links and contractor report information.
   * @param query
   */
  useBillingView: (
    query: ClientBillingQuery,
  ) => RemoteData<ClientBillingView[]>;
}

export interface WithReportDisplayService {
  reportDisplayService: ReportDisplayService;
}
