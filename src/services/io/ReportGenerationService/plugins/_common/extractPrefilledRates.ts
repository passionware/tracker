import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService";
import { GenericReport, RoleRate } from "@/services/io/_common/GenericReport";
import { parseRateConfiguration } from "@/services/io/ReportGenerationService/plugins/_common/parseRateConfiguration";
import { getTmetricProjectIdForContractor } from "@/services/io/ReportGenerationService/plugins/_common/tmetricProjectIdFromParams";

export type PrefilledRateResult = Array<{
  contractorId: number;
  rates: RoleRate[];
}>;

/**
 * Extracts prefilled rates from a GenericReport by resolving expression variables.
 * Workspace and client for expression evaluation are taken from each project's
 * parameters (from projectIteration->project), not from where the contractor was defined.
 *
 * @param report - The GenericReport to extract rates from (project types should have workspaceId, clientId in parameters)
 * @param expressionService - Service to resolve expression variables
 * @returns Prefilled rates grouped by contractor
 */
export async function extractPrefilledRatesFromGenericReport(
  report: GenericReport,
  expressionService: WithExpressionService["expressionService"],
): Promise<PrefilledRateResult> {
  // Extract unique projects from GenericReport
  // Project IDs are strings (short IDs from SharedIdMap)
  // TMetric project ID per contractor in parameters.tmetricProjectIdByContractor (or legacy originalProjectId)
  // workspaceId and clientId from parameters (projectIteration->project context)
  const projects = Object.entries(report.definitions.projectTypes).map(
    ([projectId, projectType]) => ({
      id: projectId,
      name: projectType.name,
      parameters: projectType.parameters,
    }),
  );

  // Extract unique contractors from time entries
  const contractorIds = new Set<number>();
  for (const entry of report.timeEntries) {
    contractorIds.add(entry.contractorId);
  }

  // Pre-fill rates for each contractor-project combination found in data
  const prefilled: PrefilledRateResult = [];

  for (const contractorId of contractorIds) {
    for (const project of projects) {
      const workspaceId = project.parameters?.workspaceId as number | undefined;
      const clientId = project.parameters?.clientId as number | undefined;
      if (workspaceId == null || clientId == null) {
        continue;
      }
      const expressionContext = {
        workspaceId,
        clientId,
        contractorId,
      };

      try {
        const costRateString = await expressionService.ensureExpressionValue(
          expressionContext,
          `vars.new_hour_cost_rate`,
          {},
        );

        const billingRateString = await expressionService.ensureExpressionValue(
          expressionContext,
          `vars.new_hour_billing_rate`,
          { fallback: costRateString }, // fallback to cost rate
        );

        // Use TMetric project ID for this contractor (each can have own TMetric instance)
        const tmetricProjectId = getTmetricProjectIdForContractor(
          project.parameters,
          contractorId,
          project.id,
        );
        const costRate = parseRateConfiguration(
          String(costRateString),
          tmetricProjectId,
        );
        const billingRate = parseRateConfiguration(
          String(billingRateString),
          tmetricProjectId,
        );

        const existingContractorConfig = prefilled.find(
          (c) => c.contractorId === contractorId,
        );
        const roleRate: RoleRate = {
          billing: "hourly",
          activityTypes: [],
          taskTypes: [],
          projectIds: [project.id], // Single project-specific rate
          costRate: costRate.rate,
          costCurrency: costRate.currency,
          billingRate: billingRate.rate,
          billingCurrency: billingRate.currency,
        };
        if (existingContractorConfig) {
          existingContractorConfig.rates.push(roleRate);
        } else {
          prefilled.push({
            contractorId: contractorId,
            rates: [roleRate],
          });
        }
      } catch {
        // Contractor may not be defined for this project (workspace/client); skip this combination
        continue;
      }
    }
  }

  return prefilled;
}
