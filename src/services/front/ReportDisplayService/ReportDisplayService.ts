import { ClientBilling } from "@/api/client-billing/client-billing.api.ts";
import { ContractorReportQuery } from "@/api/contractor-reports/contractor-reports.api.ts";
import { Contractor } from "@/api/contractor/contractor.api.ts";
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

export interface ReportDisplayService {
  useReportView: (
    query: ContractorReportQuery,
  ) => RemoteData<ContractorReportView[]>;
}

export interface WithReportDisplayService {
  reportDisplayService: ReportDisplayService;
}
