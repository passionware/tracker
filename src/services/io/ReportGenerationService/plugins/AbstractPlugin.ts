import { Client } from "@/api/clients/clients.api";
import { Contractor } from "@/api/contractor/contractor.api";
import { Workspace } from "@/api/workspace/workspace.api";
import { GenericReport } from "@/services/io/_common/GenericReport.ts";

export interface AbstractPlugin {
  /**
   * Generates a report for the given payload.
   * Each implementation of this interface will source the data from a different place and adapt it to the generic report format.
   */
  getReport: (payload: GetReportPayload) => Promise<GenericReport>;
}

export type GetReportPayload = {
  /**
   * List of contractor specifications.
   * Defines who, when, for whom, and in which workspace the report should be generated.
   */
  contractors: Array<{
    contractorId: Contractor["id"];
    periodStart: Date;
    periodEnd: Date;
    workspaceId: Workspace["id"];
    clientId: Client["id"];
  }>;
};

export interface ReportGenerationPayload {
  getReport: (payload: GetReportPayload) => Promise<GenericReport>;
}
