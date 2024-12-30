import { ContractorReportApi } from "@/api/contractor-reports/contractor-reports.api.ts";
import { ContractorReportService } from "@/services/ContractorReportService/ContractorReportService.ts";
import { QueryClient, useQuery } from "@tanstack/react-query";

export function createContractorReportService(
  api: ContractorReportApi,
  client: QueryClient,
): ContractorReportService {
  return {
    useContractorReports: (query) => {
      return useQuery(
        {
          queryKey: ["contractor_reports", "list"],
          queryFn: () => api.getContractorReports(query),
        },
        client,
      );
    },
    useContractorReport: (id) => {
      return useQuery(
        {
          queryKey: ["contractor_reports", "item", id],
          queryFn: () => api.getContractorReport(id),
        },
        client,
      );
    },
  };
}
