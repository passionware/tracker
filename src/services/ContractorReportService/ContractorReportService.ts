import {
  ContractorReport,
  ContractorReportQuery,
} from "@/api/contractor-reports/contractor-reports.api.ts";
import { RemoteData } from "@passionware/monads";

export interface ContractorReportService {
  useContractorReports(
    query: ContractorReportQuery,
  ): RemoteData<ContractorReport[]>;
  useContractorReport(id: ContractorReport["id"]): RemoteData<ContractorReport>;
}
