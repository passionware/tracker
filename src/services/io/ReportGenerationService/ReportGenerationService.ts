import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api";
import { ProjectIteration } from "@/api/project-iteration/project-iteration.api";
import { Report } from "@/api/reports/reports.api";

export interface ReportGenerationPayload {
  reportIds: Report["id"][];
  sourceType: "tmetric";
  projectIterationId: ProjectIteration["id"];
}

/**
 * Service for generating report sources from a collection of reports using the specified source type.
 */
export interface ReportGenerationService {
  /**
   * Generates a report source from a collection of reports using the specified source type.
   * This service processes multiple reports and creates a unified generated report source
   * that can be used for further analysis or export.
   *
   * @param payload - The generation payload containing report IDs and source type
   * @param payload.reportIds - Array of report IDs to include in the generation
   * @param payload.sourceType - The type of source to generate (e.g., "tmetric")
   * @returns Promise resolving to an object containing the ID of the generated report source
   * @throws Error if report generation fails or if any of the specified reports cannot be found
   */
  generateReport: (payload: ReportGenerationPayload) => Promise<{
    generatedReportSourceId: GeneratedReportSource["id"];
  }>;
}

export interface WithReportGenerationService {
  reportGenerationService: ReportGenerationService;
}
