import { ReportApi } from "@/api/reports/reports.api.ts";
import { MessageService } from "@/services/internal/MessageService/MessageService.ts";
import { ReportService } from "@/services/io/ReportService/ReportService.ts";
import { QueryClient, useQuery } from "@tanstack/react-query";
import { ensureIdleQuery } from "../_common/ensureIdleQuery";
import { maybe } from "@passionware/monads";

export function createReportService(
  api: ReportApi,
  client: QueryClient,
  messageService: MessageService,
): ReportService {
  messageService.reportSystemEffect.subscribeToRequest(async (request) => {
    await client.invalidateQueries({
      queryKey: ["contractor_report"],
    });
    request.sendResponse();
  });

  return {
    useReports: (query) => {
      return ensureIdleQuery(
        query,
        useQuery(
          {
            enabled: maybe.isPresent(query),
            queryKey: ["contractor_report", "list", query],
            queryFn: () => api.getReports(query!),
          },
          client,
        ),
      );
    },
    useReport: (id) => {
      return useQuery(
        {
          queryKey: ["contractor_report", "item", id],
          queryFn: () => api.getReport(id),
        },
        client,
      );
    },
    ensureReport: (id) => {
      return client.ensureQueryData({
        queryKey: ["contractor_report", "item", id],
        queryFn: () => api.getReport(id),
      });
    },
    ensureReports: (query) => {
      return client.ensureQueryData({
        queryKey: ["contractor_report", "list", query],
        queryFn: () => api.getReports(query),
      });
    },
  };
}
