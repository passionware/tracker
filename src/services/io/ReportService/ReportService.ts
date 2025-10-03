import { Report, ReportQuery } from "@/api/reports/reports.api.ts";
import { RemoteData } from "@passionware/monads";

export interface ReportService {
  useReports(query: ReportQuery): RemoteData<Report[]>;
  useReport(id: Report["id"]): RemoteData<Report>;
  ensureReport(id: Report["id"]): Promise<Report>;
  ensureReports(query: ReportQuery): Promise<Report[]>;
}

export interface WithReportService {
  reportService: ReportService;
}
