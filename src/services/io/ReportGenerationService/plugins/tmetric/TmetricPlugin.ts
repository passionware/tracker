import { WithServices } from "@/platform/typescript/services";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService";
import { GenericReport } from "@/services/io/_common/GenericReport.ts";
import { maybe } from "@passionware/monads";
import { parseRateConfiguration } from "../_common/parseRateConfiguration";
import { getTmetricProjectIdForContractor } from "../_common/tmetricProjectIdFromParams";
import { AbstractPlugin, GetReportPayload } from "../AbstractPlugin";
import { resolveTmetricReportPayload } from "./_private/config-resolver.ts";
import { adaptTMetricToGeneric } from "./_private/TmetricAdapter.ts";
import { SharedIdMap } from "./_private/SharedIdMap.ts";
import { createTMetricClient } from "./_private/TmetricClient.ts";

type TmetricConfig = WithServices<[WithExpressionService]>;

export function createTmetricPlugin(config: TmetricConfig): AbstractPlugin {
  return {
    getReport: async (payload: GetReportPayload) => {
      const configs_ = await resolveTmetricReportPayload(
        config.services,
        payload,
      );

      // Use data directly from payload - no need to fetch reports again
      // The payload already contains all necessary fields (contractorId, workspaceId, clientId)
      const configs = configs_.map((config, index) => {
        const payloadReport = payload.reports[index];
        return [config, payloadReport] as const;
      });

      // Create shared ID maps for all contractors (one per field)
      const sharedIdMaps: Record<string, SharedIdMap> = {
        activity: new SharedIdMap("a"),
        task: new SharedIdMap("t"),
        project: new SharedIdMap("p"),
      };

      const reports = await Promise.all(
        configs.map(async ([reportConfig_, trackerReport_]) => {
          const reportConfig = maybe.getOrThrow(reportConfig_);
          const trackerReport = maybe.getOrThrow(trackerReport_);
          const tmetricClient = createTMetricClient(reportConfig.config);
          const timeEntries = await tmetricClient.listTimeEntries(
            reportConfig.fetchParams,
          );

          const iterationId = trackerReport.iterationId ?? 0;
          const contractorRoleId = `iter_${iterationId}_contractor_${trackerReport.contractorId}`;
          const adapted = adaptTMetricToGeneric({
            entries: timeEntries,
            defaultRoleId: contractorRoleId,
            contractorId: trackerReport.contractorId,
            idMaps: sharedIdMaps, // Share the ID maps across contractors
          });

          // Attach iteration/project context to each project type for rate resolution and lookup by iteration+project
          const projectContext: Record<string, unknown> = {
            workspaceId: trackerReport.workspaceId,
            clientId: trackerReport.clientId,
          };
          if (trackerReport.iterationId != null) {
            projectContext.iterationId = trackerReport.iterationId;
          }
          if (trackerReport.projectId != null) {
            projectContext.projectId = trackerReport.projectId;
          }
          for (const projectType of Object.values(adapted.definitions.projectTypes)) {
            Object.assign(projectType.parameters, projectContext);
          }

          const expressionContext = {
            //todo: the context and projectType does not match?
            workspaceId: trackerReport.workspaceId,
            clientId: trackerReport.clientId,
            contractorId: trackerReport.contractorId,
          };

          // Get cost and billing rate configs (supports simple "100 EUR" or JSON per-project map)
          const costRateString =
            await config.services.expressionService.ensureExpressionValue(
              expressionContext,
              `vars.new_hour_cost_rate`,
              {},
            );
          const billingRateString =
            await config.services.expressionService.ensureExpressionValue(
              expressionContext,
              `vars.new_hour_billing_rate`,
              { fallback: costRateString },
            );

          const contractorId = trackerReport.contractorId;
          const projects = Object.entries(adapted.definitions.projectTypes).map(
            ([id, projectType]) => ({
              id,
              tmetricProjectId: getTmetricProjectIdForContractor(
                projectType.parameters,
                contractorId,
                id,
              ),
            }),
          );

          if (projects.length > 0) {
            for (const project of projects) {
              const tmetricProjectId = project.tmetricProjectId;
              const cost = parseRateConfiguration(
                String(costRateString),
                tmetricProjectId,
              );
              const billing = parseRateConfiguration(
                String(billingRateString),
                tmetricProjectId,
              );
              adapted.definitions.roleTypes[contractorRoleId].rates.push({
                billing: "hourly",
                activityTypes: [],
                taskTypes: [],
                projectIds: [project.id],
                costRate: cost.rate,
                costCurrency: cost.currency,
                billingRate: billing.rate,
                billingCurrency: billing.currency,
              });
            }
          } else {
            // No projects in report: use fallback from JSON or simple string
            const cost = parseRateConfiguration(
              String(costRateString),
              "__default__",
            );
            const billing = parseRateConfiguration(
              String(billingRateString),
              "__default__",
            );
            adapted.definitions.roleTypes[contractorRoleId].rates.push({
              billing: "hourly",
              activityTypes: [],
              taskTypes: [],
              projectIds: [],
              costRate: cost.rate,
              costCurrency: cost.currency,
              billingRate: billing.rate,
              billingCurrency: billing.currency,
            });
          }
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
 * - Activity types are merged (IDs are already shared via SharedIdMap)
 * - Task types are merged (IDs are already shared via SharedIdMap)
 * - Project types are merged (IDs are already shared via SharedIdMap)
 * - Project types are merged
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

    // Merge task types (IDs are already shared via SharedIdMap, so no remapping needed)
    Object.assign(merged.definitions.taskTypes, report.definitions.taskTypes);

    // Merge activity types (IDs are already shared via SharedIdMap, so no remapping needed)
    Object.assign(
      merged.definitions.activityTypes,
      report.definitions.activityTypes,
    );

    // Merge project types: combine tmetricProjectIdByContractor and iterationIds
    for (const [projectId, incomingType] of Object.entries(
      report.definitions.projectTypes,
    )) {
      const existing = merged.definitions.projectTypes[projectId];
      const existingMap =
        (existing?.parameters?.tmetricProjectIdByContractor as
          | Record<string, string>
          | undefined) ?? {};
      const incomingMap =
        (incomingType.parameters?.tmetricProjectIdByContractor as
          | Record<string, string>
          | undefined) ?? {};
      const existingIterationIds = new Set<number>(
        (existing?.parameters?.iterationIds as number[] | undefined) ??
          (existing?.parameters?.iterationId != null
            ? [existing.parameters.iterationId as number]
            : []),
      );
      const incomingIterationId = incomingType.parameters?.iterationId as
        | number
        | undefined;
      if (incomingIterationId != null) {
        existingIterationIds.add(incomingIterationId);
      }
      merged.definitions.projectTypes[projectId] = {
        ...(existing ?? incomingType),
        name: existing?.name ?? incomingType.name,
        description: existing?.description ?? incomingType.description,
        parameters: {
          ...existing?.parameters,
          ...incomingType.parameters,
          tmetricProjectIdByContractor: {
            ...existingMap,
            ...incomingMap,
          },
          iterationIds: [...existingIterationIds],
        },
      };
    }

    // Keep role types separate - each contractor has their own role
    Object.assign(merged.definitions.roleTypes, report.definitions.roleTypes);

    // Combine time entries (IDs are already consistent across reports via SharedIdMap)
    merged.timeEntries.push(...report.timeEntries);
  }

  return merged;
}
