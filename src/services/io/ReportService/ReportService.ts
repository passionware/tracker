import { Report, ReportQuery } from "@/api/reports/reports.api.ts";
import { Maybe, RemoteData } from "@passionware/monads";

export interface ReportService {
  useReports(query: Maybe<ReportQuery>): RemoteData<Report[]>;
  useReport(id: Maybe<Report["id"]>): RemoteData<Report>;
  /** One query per id; shares cache with `useReport` / `ensureReport`. */
  useReportsByIds(ids: Maybe<Report["id"][]>): RemoteData<Report[]>;
  ensureReport(id: Report["id"]): Promise<Report>;
  ensureReports(query: ReportQuery): Promise<Report[]>;
}

export interface WithReportService {
  reportService: ReportService;
}
