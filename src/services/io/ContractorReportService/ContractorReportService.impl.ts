import { ContractorReportApi } from "@/api/contractor-reports/contractor-reports.api.ts";
import { MessageService } from "@/services/internal/MessageService/MessageService.ts";
import { ContractorReportService } from "@/services/io/ContractorReportService/ContractorReportService.ts";
import { QueryClient, useQuery } from "@tanstack/react-query";

export function createContractorReportService(
  api: ContractorReportApi,
  client: QueryClient,
  messageService: MessageService,
): ContractorReportService {
  messageService.reportSystemEffect.subscribeToRequest(async (request) => {
    await client.invalidateQueries({
      queryKey: ["contractor_reports"],
    });
    request.resolveCallback();
  });

  return {
    useContractorReports: (query) => {
      return useQuery(
        {
          queryKey: ["contractor_reports", "list", query],
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
