import { CockpitCubeReportWithCreator } from "@/api/cockpit-cube-reports/cockpit-cube-reports.api";
import { RemoteData } from "@passionware/monads";

export interface ClientCubeReportService {
  useCubeReports: (
    tenantId: string | null,
  ) => RemoteData<CockpitCubeReportWithCreator[]>;
  useCubeReport: (
    reportId: string | null,
  ) => RemoteData<CockpitCubeReportWithCreator>;
}

export interface WithClientCubeReportService {
  clientCubeReportService: ClientCubeReportService;
}
