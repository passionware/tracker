import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService";
import { GenericReport, RoleRate } from "@/services/io/_common/GenericReport";
import { getContractorIdFromRoleKey } from "@/services/io/_common/roleKeyUtils";
import {
  REPORT_PROJECT_RATE_SOURCE_EXPLICIT,
  scopeTmetricReportProjectId,
} from "@/services/io/ReportGenerationService/plugins/_common/projectTmetricConfiguration";

function explicitScopedProjectIdFromParameters(
  parameters: Record<string, unknown> | undefined,
): string | null {
  const trackerId = parameters?.trackerProjectId;
  const reportProjectId = parameters?.reportProjectId;
  if (typeof trackerId === "number" && typeof reportProjectId === "string") {
    return scopeTmetricReportProjectId(trackerId, reportProjectId);
  }
  return null;
}

/** One entry per `iter_*_contractor_*` role key so merged reports stay correct. */
export type PrefilledRateResult = Array<{
  roleId: string;
  contractorId: number;
  rates: RoleRate[];
}>;

export type ExtractPrefilledRatesOptions = {
  /**
   * Contractors to include even when they have no time entries in `report`
   * (e.g. assigned to the iteration/project). Duplicates time-entry contractors are ignored.
   */
  additionalContractorIds?: readonly number[];
};

/**
 * Extracts prefilled rates from a GenericReport by resolving expression variables.
 * Workspace and client for expression evaluation are taken from each project's
 * parameters (from projectIteration->project), not from where the contractor was defined.
 *
 * @param report - The GenericReport to extract rates from (project types should have workspaceId, clientId in parameters)
 * @param expressionService - Service to resolve expression variables
 * @param options - Optional `additionalContractorIds` merged with contractors found on time entries
 * @returns Prefilled rates grouped by contractor
 */
export async function extractPrefilledRatesFromGenericReport(
  report: GenericReport,
  _expressionService: WithExpressionService["expressionService"],
  options?: ExtractPrefilledRatesOptions,
): Promise<PrefilledRateResult> {
  // Extract unique projects from GenericReport
  // TMetric uses explicit mapping: report project ids are scoped with
  // {@link scopeTmetricReportProjectId} (ASCII 0x1f between tracker id and JSON id).
  // Merged reports list every project type; a contractor may only have explicit rate
  // rows for some of them — skip pairs with no row unless a time entry needs that project.
  const projects = Object.entries(report.definitions.projectTypes).map(
    ([projectId, projectType]) => ({
      id: projectId,
      name: projectType.name,
      parameters: projectType.parameters,
    }),
  );

  const contractorIds = new Set<number>();
  for (const entry of report.timeEntries) {
    contractorIds.add(entry.contractorId);
  }
  for (const id of options?.additionalContractorIds ?? []) {
    contractorIds.add(id);
  }

  const prefilled: PrefilledRateResult = [];

  for (const roleId of Object.keys(report.definitions.roleTypes)) {
    const contractorId = getContractorIdFromRoleKey(roleId);
    if (contractorId == null || !contractorIds.has(contractorId)) {
      continue;
    }

    const ratesForRole: RoleRate[] = [];

    for (const project of projects) {
      const workspaceId = project.parameters?.workspaceId as number | undefined;
      const clientId = project.parameters?.clientId as number | undefined;
      if (workspaceId == null || clientId == null) {
        throw new Error(
          `TMetric prefilled rates: project "${project.id}" is missing workspaceId or clientId on parameters (required for explicit reports).`,
        );
      }

      const isExplicit =
        project.parameters?.rateSource ===
        REPORT_PROJECT_RATE_SOURCE_EXPLICIT;

      if (!isExplicit) {
        throw new Error(
          `TMetric reports require explicit rate configuration (rateSource "${REPORT_PROJECT_RATE_SOURCE_EXPLICIT}" on project "${project.id}"). Legacy vars.new_hour_* rates are no longer supported.`,
        );
      }

      const scopedFromParameters = explicitScopedProjectIdFromParameters(
        project.parameters,
      );
      const fromRole = report.definitions.roleTypes[roleId]?.rates.find(
        (r) =>
          r.projectIds.includes(project.id) ||
          (scopedFromParameters != null &&
            r.projectIds.includes(scopedFromParameters)) ||
          r.projectIds[0] === project.id ||
          (scopedFromParameters != null &&
            r.projectIds[0] === scopedFromParameters),
      );
      if (!fromRole) {
        const hasEntryOnProject = report.timeEntries.some(
          (e) =>
            e.roleId === roleId &&
            e.contractorId === contractorId &&
            e.projectId === project.id,
        );
        if (hasEntryOnProject) {
          throw new Error(
            `TMetric prefilled rates: no explicit rate row for contractor ${contractorId} on project "${project.id}" (role ${roleId}).`,
          );
        }
        continue;
      }
      ratesForRole.push({ ...fromRole });
    }

    if (ratesForRole.length > 0) {
      prefilled.push({
        roleId,
        contractorId,
        rates: ratesForRole,
      });
    }
  }

  return prefilled;
}
