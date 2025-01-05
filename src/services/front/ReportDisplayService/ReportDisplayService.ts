import { ContractorReportQuery } from "@/api/contractor-reports/contractor-reports.api.ts";
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
  status: "billed" | "uncovered";
  reconciledAmount: CurrencyValue;
  remainingAmount: CurrencyValue;
}

export interface ReportDisplayService {
  useReportView: (
    query: ContractorReportQuery,
  ) => RemoteData<ContractorReportView[]>;
}

export interface WithReportDisplayService {
  reportDisplayService: ReportDisplayService;
}
