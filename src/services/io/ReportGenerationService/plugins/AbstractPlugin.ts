import { Client } from "@/api/clients/clients.api";
import { Contractor } from "@/api/contractor/contractor.api";
import { Report } from "@/api/reports/reports.api";
import { Workspace } from "@/api/workspace/workspace.api";
import { GenericReport } from "@/services/io/_common/GenericReport.ts";
import { CalendarDate } from "@internationalized/date";

export interface AbstractPlugin {
  /**
   * Generates a report for the given payload.
   * Each implementation of this interface will source the data from a different place and adapt it to the generic report format.
   */
  getReport: (
    payload: GetReportPayload,
  ) => Promise<{ reportData: GenericReport; originalData: unknown }>;
}

export type GetReportPayload = {
  /**
   * List of contractor specifications.
   * Defines who, when, for whom, and in which workspace the report should be generated.
   */
  reports: Array<{
    contractorId: Contractor["id"];
    periodStart: CalendarDate;
    periodEnd: CalendarDate;
    workspaceId: Workspace["id"];
    clientId: Client["id"];
    reportId: Report["id"];
  }>;
};

export interface ReportGenerationPayload {
  getReport: (payload: GetReportPayload) => Promise<GenericReport>;
}
