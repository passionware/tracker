import { WithServices } from "@/platform/typescript/services";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService";
import { WithReportService } from "@/services/io/ReportService/ReportService";
import { maybe } from "@passionware/monads";
import { zip } from "lodash";
import { adaptTMetricToGeneric } from "../../tmetric/TmetricAdapter";
import { createTMetricClient } from "../../tmetric/TmetricClient";
import { TMetricClient } from "../../tmetric/TmetricSchemas";
import { AbstractPlugin, GetReportPayload } from "../AbstractPlugin";
import { resolveTmetricReportPayload } from "./config-resolver";

interface TmetricConfig
  extends WithServices<[WithExpressionService, WithReportService]> {
  client: TMetricClient;
}

export function createTmetricPlugin(config: TmetricConfig): AbstractPlugin {
  return {
    getReport: async (payload: GetReportPayload) => {
      const configs_ = await resolveTmetricReportPayload(
        config.services,
        payload,
      );
      const trackerReports = await Promise.all(
        payload.contractors.map(async (contractor) => {
          return await config.services.reportService.ensureReport(
            contractor.contractorId,
          );
        }),
      );
      const configs = zip(configs_, trackerReports);
      const reports = await Promise.all(
        configs.map(async ([reportConfig_, trackerReport_]) => {
          const reportConfig = maybe.getOrThrow(reportConfig_);
          const trackerReport = maybe.getOrThrow(trackerReport_);
          const tmetricClient = createTMetricClient(reportConfig.config);
          const timeEntries = await tmetricClient.listTimeEntries(
            reportConfig.fetchParams,
          );

          const projects = await tmetricClient.listProjects();
          const users = await tmetricClient.listUsers();
          const defaultRoleId = "developer";
          const adapted = adaptTMetricToGeneric({
            entries: timeEntries,
            projects,
            users,
            defaultRoleId,
            currency: trackerReport.currency,
          });
          adapted.definitions.roleTypes[defaultRoleId].rates.push({
            billing: "hourly",
            activityType: "development",
            taskType: "development",
            currency: trackerReport.currency,
            rate: Number(
              await config.services.expressionService.ensureExpressionValue(
                {
                  workspaceId: trackerReport.workspaceId,
                  clientId: trackerReport.clientId,
                  contractorId: trackerReport.contractorId,
                },
                `vars.hour_rate`,
                {},
              ),
            ),
          });
          return adapted;
        }),
      );
      return reports;
    },
  };
}
