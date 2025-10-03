import { GeneratedReportSourceApi } from "@/api/generated-report-source/generated-report-source.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { ensureIdleQuery } from "@/services/io/_common/ensureIdleQuery.ts";
import { GeneratedReportSourceService } from "@/services/io/GeneratedReportSourceService/GeneratedReportSourceService.ts";
import { QueryClient, useQuery } from "@tanstack/react-query";

export function createGeneratedReportSourceService({
  services,
  client,
  api,
}: WithServices<[WithMessageService]> & {
  api: GeneratedReportSourceApi;
  client: QueryClient;
}): GeneratedReportSourceService {
  services.messageService.reportSystemEffect.subscribeToRequest(
    async (request) => {
      await client.invalidateQueries({
        queryKey: ["generated-report-source"],
      });
      request.sendResponse();
    },
  );

  return {
    useGeneratedReportSources: (query) =>
      ensureIdleQuery(
        query,
        useQuery(
          {
            queryKey: ["generated-report-source", "list", query],
            queryFn: () => api.getGeneratedReportSources(query!),
            enabled: !!query,
          },
          client,
        ),
      ),
    useGeneratedReportSource: (id) =>
      ensureIdleQuery(
        id,
        useQuery(
          {
            enabled: !!id,
            queryKey: ["generated-report-source", "detail", id],
            queryFn: () => api.getGeneratedReportSource(id!),
          },
          client,
        ),
      ),
  };
}
