import { reportQueryUtils } from "@/api/reports/reports.api.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { WithServices } from "@/platform/typescript/services";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService";
import { GenericReport } from "@/services/io/_common/GenericReport.ts";
import { WithReportService } from "@/services/io/ReportService/ReportService";
import { maybe } from "@passionware/monads";
import { zip } from "lodash";
import { AbstractPlugin, GetReportPayload } from "../AbstractPlugin";
import { resolveTmetricReportPayload } from "./_private/config-resolver.ts";
import { adaptTMetricToGeneric } from "./_private/TmetricAdapter.ts";
import { createTMetricClient } from "./_private/TmetricClient.ts";

type TmetricConfig = WithServices<[WithExpressionService, WithReportService]>;

export function createTmetricPlugin(config: TmetricConfig): AbstractPlugin {
  return {
    getReport: async (payload: GetReportPayload) => {
      const configs_ = await resolveTmetricReportPayload(
        config.services,
        payload,
      );
      const trackerReports = await config.services.reportService.ensureReports(
        reportQueryUtils
          .getBuilder(idSpecUtils.ofAll(), idSpecUtils.ofAll())
          .build((q) => [
            q.withFilter("id", {
              operator: "oneOf",
              value: payload.reports.map((r) => r.reportId),
            }),
          ]),
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

          // Use contractor name as role ID to keep rates separate
          const contractorRoleId = `contractor_${trackerReport.contractorId}`;
          const adapted = adaptTMetricToGeneric({
            entries: timeEntries,
            defaultRoleId: contractorRoleId,
            currency: trackerReport.currency,
            contractorId: trackerReport.contractorId,
          });
          // Helper function to parse rate with currency from environment variable
          const parseRateWithCurrency = (
            rateString: string,
          ): { rate: number; currency: string } => {
            const trimmed = rateString.toString().trim();
            const parts = trimmed.split(/\s+/);

            if (parts.length >= 2) {
              // Format: "100 EUR" or "100 eur"
              const rate = Number(parts[0]);
              const currency = parts[1].toUpperCase();
              return { rate, currency };
            } else {
              // Format: "100" (no currency specified)
              const rate = Number(parts[0]);
              return { rate, currency: trackerReport.currency || "EUR" };
            }
          };

          // Get cost rate (what we pay the contractor)
          const costRateString =
            await config.services.expressionService.ensureExpressionValue(
              {
                workspaceId: trackerReport.workspaceId,
                clientId: trackerReport.clientId,
                contractorId: trackerReport.contractorId,
              },
              `vars.hour_cost_rate`,
              {},
            );
          const { rate: costRate, currency: costCurrency } =
            parseRateWithCurrency(String(costRateString));

          // Get billing rate (what we charge the client) - with markup/interest
          const billingRateString =
            await config.services.expressionService.ensureExpressionValue(
              {
                workspaceId: trackerReport.workspaceId,
                clientId: trackerReport.clientId,
                contractorId: trackerReport.contractorId,
              },
              `vars.hour_billing_rate`,
              { fallback: `${costRate} ${costCurrency}` }, // fallback to cost rate if billing rate not set
            );
          const { rate: billingRate, currency: billingCurrency } =
            parseRateWithCurrency(String(billingRateString));

          adapted.definitions.roleTypes[contractorRoleId].rates.push({
            billing: "hourly",
            activityTypes: [],
            taskTypes: [],
            projectIds: [],
            costRate,
            costCurrency,
            billingRate,
            billingCurrency,
          });
          return {
            reportData: adapted,
            originalData: timeEntries,
          };
        }),
      );

      return {
        // Merge all reports into a single report
        reportData: mergeGenericReports(reports.map((r) => r.reportData)),
        originalData: reports.map((r) => r.originalData),
      };
    },
  };
}

/**
 * Merges multiple GenericReport objects into a single report.
 * - Task types are merged by their IDs (original tmetric entry descriptions)
 * - Activity types are merged (should be the same across contractors)
 * - Role types are kept separate (each contractor has their own role with rates)
 * - Time entries are combined from all reports
 */
function mergeGenericReports(reports: GenericReport[]): GenericReport {
  if (reports.length === 0) {
    throw new Error("Cannot merge empty reports array");
  }

  if (reports.length === 1) {
    return reports[0];
  }

  // Start with the first report as base
  const merged: GenericReport = {
    definitions: {
      taskTypes: { ...reports[0].definitions.taskTypes },
      activityTypes: { ...reports[0].definitions.activityTypes },
      projectTypes: { ...reports[0].definitions.projectTypes },
      roleTypes: { ...reports[0].definitions.roleTypes },
    },
    timeEntries: [...reports[0].timeEntries],
  };

  // Merge remaining reports
  for (let i = 1; i < reports.length; i++) {
    const report = reports[i];

    // Merge task types by ID (original tmetric entry descriptions)
    Object.assign(merged.definitions.taskTypes, report.definitions.taskTypes);

    // Merge activity types (should be the same, but merge to be safe)
    Object.assign(
      merged.definitions.activityTypes,
      report.definitions.activityTypes,
    );

    // Merge project types
    Object.assign(
      merged.definitions.projectTypes,
      report.definitions.projectTypes,
    );

    // Keep role types separate - each contractor has their own role
    Object.assign(merged.definitions.roleTypes, report.definitions.roleTypes);

    // Combine time entries
    merged.timeEntries.push(...report.timeEntries);
  }

  return merged;
}
