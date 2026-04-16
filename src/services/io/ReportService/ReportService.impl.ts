import { ReportApi } from "@/api/reports/reports.api.ts";
import { MessageService } from "@/services/internal/MessageService/MessageService.ts";
import { ReportService } from "@/services/io/ReportService/ReportService.ts";
import { QueryClient, useQueries, useQuery } from "@tanstack/react-query";
import { ensureIdleQuery } from "../_common/ensureIdleQuery";
import { maybe, rd } from "@passionware/monads";

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
      return ensureIdleQuery(
        id,
        useQuery(
          {
            enabled: maybe.isPresent(id),
            queryKey: ["contractor_report", "item", id],
            queryFn: () => api.getReport(id!),
          },
          client,
        ),
      );
    },
    useReportsByIds: (ids) => {
      const idList = maybe.mapOrElse(ids, (list) => list, [] as number[]);
      const results = useQueries(
        {
          queries: idList.map((id) => ({
            queryKey: ["contractor_report", "item", id],
            queryFn: () => api.getReport(id),
          })),
        },
        client,
      );
      return rd.useMemoMap(
        ensureIdleQuery(ids, rd.combineAll(results)),
        (reports) => reports,
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
