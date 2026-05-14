import { reportQueryUtils } from "@/api/reports/reports.api";
import { idSpecUtils } from "@/platform/lang/IdSpec";
import { WithServices } from "@/platform/typescript/services";
import { maybe } from "@passionware/monads";
import { WithGeneratedReportSourceWriteService } from "../GeneratedReportSourceWriteService/GeneratedReportSourceWriteService";
import { WithProjectIterationService } from "../ProjectIterationService/ProjectIterationService";
import { WithReportService } from "../ReportService/ReportService";
import { AbstractPlugin } from "./plugins/AbstractPlugin";
import { ReportGenerationService } from "./ReportGenerationService";

export interface ReportGenerationServiceConfig
  extends WithServices<
    [
      WithReportService,
      WithGeneratedReportSourceWriteService,
      WithProjectIterationService,
    ]
  > {
  plugins: Record<string, AbstractPlugin>;
}

export function createReportGenerationService(
  config: ReportGenerationServiceConfig,
): ReportGenerationService {
  return {
    generateReport: async (payload) => {
      const iteration =
        await config.services.projectIterationService.ensureProjectIterationDetail(
          payload.projectIterationId,
        );
      const trackerProjectId = iteration.projectId;

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
            contractorId: trackerReport.contractorId,
            periodStart: trackerReport.periodStart,
            periodEnd: trackerReport.periodEnd,
            workspaceId: trackerReport.workspaceId,
            clientId: trackerReport.clientId,
            iterationId: payload.projectIterationId,
            projectId: trackerProjectId,
          })),
        });

      const generatedReportSource =
        await config.services.generatedReportSourceWriteService.createGeneratedReportSource(
          {
            projectIterationId: payload.projectIterationId,
            data: report.reportData,
            originalData: report.originalData,
          },
        );

      return {
        generatedReportSourceId: generatedReportSource.id,
      };
    },
  };
}
