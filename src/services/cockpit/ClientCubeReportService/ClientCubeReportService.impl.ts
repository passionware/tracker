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

    publishReport: async (params) => {
      const result = await api.createReport(params.tenantId, params.userId, {
        name: params.name,
        description: params.description,
        cube_data: params.cubeData,
        cube_config: params.cubeConfig,
      });

      // Invalidate the reports list to refresh it
      await client.invalidateQueries({
        queryKey: ["cockpit_cube_reports", "list", params.tenantId],
      });

      return result;
    },
  };
}
