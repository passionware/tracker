import {
  CockpitCubeReport,
  CockpitCubeReportWithCreator,
} from "@/api/cockpit-cube-reports/cockpit-cube-reports.api";
import { Maybe, RemoteData } from "@passionware/monads";

export interface PublishCubeReportParams {
  tenantId: string;
  userId: string;
  clientId: number;
  name: string;
  description?: string;
  cubeData: Record<string, unknown>;
  cubeConfig: Record<string, unknown>;
}

export interface ClientCubeReportService {
  useCubeReports: (
    tenantId: Maybe<string>,
  ) => RemoteData<CockpitCubeReportWithCreator[]>;
  useCubeReport: (
    reportId: string | null,
  ) => RemoteData<CockpitCubeReportWithCreator>;
  publishReport: (
    params: PublishCubeReportParams,
  ) => Promise<CockpitCubeReport>;
  deleteReport: (reportId: string) => Promise<void>;
  setReportPublished: (reportId: string) => Promise<CockpitCubeReport>;
  setReportUnpublished: (reportId: string) => Promise<CockpitCubeReport>;
}

export interface WithClientCubeReportService {
  clientCubeReportService: ClientCubeReportService;
}
