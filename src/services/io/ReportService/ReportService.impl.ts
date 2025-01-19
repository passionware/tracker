import { ReportApi } from "@/api/reports/reports.api.ts";
import { MessageService } from "@/services/internal/MessageService/MessageService.ts";
import { ReportService } from "@/services/io/ReportService/ReportService.ts";
import { QueryClient, useQuery } from "@tanstack/react-query";

export function createReportService(
  api: ReportApi,
  client: QueryClient,
  messageService: MessageService,
): ReportService {
  messageService.reportSystemEffect.subscribeToRequest(async (request) => {
    await client.invalidateQueries({
      queryKey: ["contractor_reports"],
    });
    request.sendResponse();
  });

  return {
    useReports: (query) => {
      return useQuery(
        {
          queryKey: ["contractor_reports", "list", query],
          queryFn: () => api.getReports(query),
        },
        client,
      );
    },
    useReport: (id) => {
      return useQuery(
        {
          queryKey: ["contractor_reports", "item", id],
          queryFn: () => api.getReport(id),
        },
        client,
      );
    },
  };
}
