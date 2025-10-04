import { reportQueryUtils } from "@/api/reports/reports.api";
import { idSpecUtils } from "@/platform/lang/IdSpec";
import { WithServices } from "@/platform/typescript/services";
import { maybe } from "@passionware/monads";
import { WithReportService } from "../ReportService/ReportService";
import { AbstractPlugin } from "./plugins/AbstractPlugin";
import { ReportGenerationService } from "./ReportGenerationService";

export interface ReportGenerationServiceConfig
  extends WithServices<[WithReportService]> {
  plugins: Record<string, AbstractPlugin>;
}

export function createReportGenerationService(
  config: ReportGenerationServiceConfig,
): ReportGenerationService {
  return {
    generateReport: async (payload) => {
      const trackerReports = await config.services.reportService.ensureReports(
        reportQueryUtils
          .getBuilder(idSpecUtils.ofAll(), idSpecUtils.ofAll())
          .build((q) => [
            q.withFilter("id", { operator: "oneOf", value: payload.reportIds }),
          ]),
      );
      const report = await maybe
        .getOrThrow(
          config.plugins[payload.sourceType],
          "Requested plugin is not configured",
        )
        .getReport({
          reports: trackerReports.map((trackerReport) => ({
            ...trackerReport,
            reportId: trackerReport.id,
          })),
        });

      console.log("Generated Report:", report);

      return {
        generatedReportSourceId: 123,
      };
    },
  };
}
