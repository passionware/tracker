import { WithServices } from "@/platform/typescript/services";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService";
import { WithVariableService } from "@/services/io/VariableService/VariableService";
import { GenericReport } from "@/services/io/_common/GenericReport.ts";
import { maybe } from "@passionware/monads";
import {
  ensureProjectTmetricConfigurationFromVariables,
  getExplicitTmetricProjectIdsForContractor,
} from "../_common/projectTmetricConfiguration.ts";
import type { ProjectTmetricConfigurationV1 } from "../_common/projectTmetricConfiguration.ts";
import { AbstractPlugin, GetReportPayload } from "../AbstractPlugin";
import { resolveTmetricReportPayload } from "./_private/config-resolver.ts";
import { adaptTMetricToGenericFromExplicitConfig } from "./_private/TmetricAdapter.ts";
import { SharedIdMap } from "./_private/SharedIdMap.ts";
import { createTMetricClient } from "./_private/TmetricClient.ts";

type TmetricConfig = WithServices<[WithExpressionService, WithVariableService]>;

export function createTmetricPlugin(config: TmetricConfig): AbstractPlugin {
  return {
    getReport: async (payload: GetReportPayload) => {
      const distinctProjectContexts = new Map<
        string,
        { workspaceId: number; clientId: number; trackerProjectId: number }
      >();
      for (const r of payload.reports) {
        if (r.projectId == null) {
          throw new Error(
            "TMetric report row requires a Tracker project id (projectId).",
          );
        }
        const key = `${r.workspaceId}|${r.clientId}|${r.projectId}`;
        distinctProjectContexts.set(key, {
          workspaceId: r.workspaceId,
          clientId: r.clientId,
          trackerProjectId: r.projectId,
        });
      }

      const explicitByTrackerProjectId = new Map<
        number,
        ProjectTmetricConfigurationV1
      >();

      for (const ctx of distinctProjectContexts.values()) {
        const cfg = await ensureProjectTmetricConfigurationFromVariables(
          config.services.variableService,
          {
            workspaceId: ctx.workspaceId,
            clientId: ctx.clientId,
            projectId: ctx.trackerProjectId,
          },
        );
        explicitByTrackerProjectId.set(ctx.trackerProjectId, cfg);
      }

      const explicitIdsPerReport = payload.reports.map((r) => {
        if (r.projectId == null) {
          throw new Error(
            "TMetric report row requires a Tracker project id (projectId).",
          );
        }
        const cfg = explicitByTrackerProjectId.get(r.projectId);
        if (!cfg) {
          throw new Error(
            `TMetric mapping could not be loaded for Tracker project ${r.projectId}.`,
          );
        }
        const ids = getExplicitTmetricProjectIdsForContractor(
          cfg,
          r.contractorId,
        );
        if (ids.length === 0) {
          throw new Error(
            `TMetric explicit configuration: no TMetric project ids configured for contractor ${r.contractorId} on Tracker project ${r.projectId}.`,
          );
        }
        return ids;
      });

      const configs_ = await resolveTmetricReportPayload(
        config.services,
        payload,
        explicitIdsPerReport,
      );

      const configs = configs_.map((config, index) => {
        const payloadReport = payload.reports[index];
        return [config, payloadReport] as const;
      });

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

          const explicitConfig = explicitByTrackerProjectId.get(
            trackerReport.projectId!,
          )!;

          const contractorLabel = `Contractor #${trackerReport.contractorId}`;

          const adapted = adaptTMetricToGenericFromExplicitConfig({
            entries: timeEntries,
            defaultRoleId: contractorRoleId,
            contractorId: trackerReport.contractorId,
            explicitConfig,
            contractorLabel,
            trackerProjectId: trackerReport.projectId!,
            idMaps: sharedIdMaps,
          });

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
          for (const projectType of Object.values(
            adapted.definitions.projectTypes,
          )) {
            Object.assign(projectType.parameters, projectContext);
          }

          return {
            reportData: adapted,
            originalData: timeEntries,
          };
        }),
      );

      return {
        reportData: mergeGenericReports(reports.map((r) => r.reportData)),
        originalData: reports.map((r) => r.originalData),
      };
    },
  };
}

export function mergeGenericReports(reports: GenericReport[]): GenericReport {
  if (reports.length === 0) {
    throw new Error("Cannot merge empty reports array");
  }

  if (reports.length === 1) {
    return reports[0];
  }

  const merged: GenericReport = {
    definitions: {
      taskTypes: { ...reports[0].definitions.taskTypes },
      activityTypes: { ...reports[0].definitions.activityTypes },
      projectTypes: { ...reports[0].definitions.projectTypes },
      roleTypes: { ...reports[0].definitions.roleTypes },
    },
    timeEntries: [...reports[0].timeEntries],
  };

  for (let i = 1; i < reports.length; i++) {
    const report = reports[i];

    Object.assign(merged.definitions.taskTypes, report.definitions.taskTypes);

    Object.assign(
      merged.definitions.activityTypes,
      report.definitions.activityTypes,
    );

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

    for (const [roleKey, incomingRole] of Object.entries(
      report.definitions.roleTypes,
    )) {
      const existing = merged.definitions.roleTypes[roleKey];
      if (!existing) {
        merged.definitions.roleTypes[roleKey] = incomingRole;
      } else {
        merged.definitions.roleTypes[roleKey] = {
          ...existing,
          ...incomingRole,
          rates: [
            ...(existing.rates ?? []),
            ...(incomingRole.rates ?? []),
          ],
        };
      }
    }

    merged.timeEntries.push(...report.timeEntries);
  }

  return merged;
}
