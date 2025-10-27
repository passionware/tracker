import { createGeneratedReportSourceMock } from "@/api/generated-report-source/generated-report-source.mock.ts";
import { GeneratedReportSourceService } from "@/services/io/GeneratedReportSourceService/GeneratedReportSourceService.ts";
import { QueryClient, useQuery } from "@tanstack/react-query";

export function createGeneratedReportSourceServiceMock(
  client: QueryClient,
): GeneratedReportSourceService {
  const mockApi = createGeneratedReportSourceMock();

  return {
    useGeneratedReportSources: (query) =>
      useQuery(
        {
          queryKey: ["generated-report-source", "list", query],
          queryFn: () => mockApi.getGeneratedReportSources(query!),
          enabled: !!query,
        },
        client,
      ),
    useGeneratedReportSource: (id) =>
      useQuery(
        {
          enabled: !!id,
          queryKey: ["generated-report-source", "detail", id],
          queryFn: () => mockApi.getGeneratedReportSource(id!),
        },
        client,
      ),
  };
}
