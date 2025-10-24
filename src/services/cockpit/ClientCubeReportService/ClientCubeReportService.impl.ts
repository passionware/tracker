import { CockpitCubeReportsApi } from "@/api/cockpit-cube-reports/cockpit-cube-reports.api";
import { maybe } from "@passionware/monads";
import { QueryClient, useQuery } from "@tanstack/react-query";
import { ensureIdleQuery } from "@/services/io/_common/ensureIdleQuery.ts";
import { ClientCubeReportService } from "./ClientCubeReportService";

export function createClientCubeReportService(
  api: CockpitCubeReportsApi,
  client: QueryClient,
): ClientCubeReportService {
  return {
    useCubeReports: (tenantId) =>
      ensureIdleQuery(
        tenantId,
        useQuery(
          {
            queryKey: ["cockpit_cube_reports", "list", tenantId],
            enabled: maybe.isPresent(tenantId),
            queryFn: () => api.listReports(tenantId!),
          },
          client,
        ),
      ),

    useCubeReport: (reportId) =>
      ensureIdleQuery(
        reportId,
        useQuery(
          {
            queryKey: ["cockpit_cube_reports", "detail", reportId],
            enabled: maybe.isPresent(reportId),
            queryFn: () => api.getReport(reportId!),
          },
          client,
        ),
      ),
  };
}
