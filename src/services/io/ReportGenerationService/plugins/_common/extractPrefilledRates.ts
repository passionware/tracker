import { Report } from "@/api/reports/reports.api";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService";
import { GenericReport, RoleRate } from "@/services/io/_common/GenericReport";

export type PrefilledRateResult = Array<{
  contractorId: number;
  rates: RoleRate[];
}>;

/**
 * Extracts prefilled rates from a GenericReport by resolving expression variables.
 * This function is agnostic to the source of the GenericReport (TMetric, etc.)
 *
 * @param report - The GenericReport to extract rates from
 * @param expressionService - Service to resolve expression variables
 * @param contractorReports - Map of contractorId to Report for context (workspaceId, clientId)
 * @returns Prefilled rates grouped by contractor
 */
export async function extractPrefilledRatesFromGenericReport(
  report: GenericReport,
  expressionService: WithExpressionService["expressionService"],
  contractorReports: Map<number, Report>,
): Promise<PrefilledRateResult> {
  // Parse rate configuration (supports both simple strings and JSON arrays)
  const parseRateConfiguration = (rateConfig: string, projectId: string) => {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(rateConfig);
      if (Array.isArray(parsed)) {
        // JSON format: [{ projectIds: ['id1'], rate: '123 eur' }]
        const matchingConfig = parsed.find(
          (config: { projectIds?: Array<string | number>; rate?: string }) =>
            config.projectIds?.includes(projectId) ||
            config.projectIds?.includes(Number(projectId)) ||
            config.projectIds?.some((id) => String(id) === projectId),
        );
        if (matchingConfig && matchingConfig.rate) {
          return parseSimpleRate(matchingConfig.rate);
        }
        // No matching project in JSON array, fall through to simple parsing
      }
    } catch {
      // Not JSON, treat as simple string
    }

    // Fallback to simple string parsing (works for both JSON fallback and simple strings)
    return parseSimpleRate(rateConfig);
  };

  const parseSimpleRate = (rateString: string) => {
    const match = String(rateString)
      .trim()
      .match(/^([\d.,]+)\s*([A-Za-z]{3})$/);
    if (!match) {
      throw new Error(`Invalid rate string: ${rateString}`);
    }
    const parts = match
      ? [match[1], match[2]]
      : String(rateString).trim().split(/\s+/);
    return {
      rate: parseFloat(parts[0]) || 0,
      currency: parts[1] || "EUR",
    };
  };

  // Extract unique projects from GenericReport
  // Project IDs are strings (from TMetric project.id converted to string)
  const projects = Object.entries(report.definitions.projectTypes).map(
    ([projectId, projectType]) => ({
      id: projectId, // Keep as string to match TMetric project IDs
      name: projectType.name,
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
    // Find the report for this contractor to get the correct workspace/client context
    const contractorReport = contractorReports.get(contractorId);
    if (!contractorReport) {
      continue;
    }

    for (const project of projects) {
      const expressionContext = {
        workspaceId: contractorReport.workspaceId,
        clientId: contractorReport.clientId,
        contractorId: contractorId,
      };

      const costRateString = await expressionService.ensureExpressionValue(
        expressionContext,
        `vars.hour_cost_rate`,
        {},
      );

      const billingRateString = await expressionService.ensureExpressionValue(
        expressionContext,
        `vars.hour_billing_rate`,
        { fallback: costRateString }, // fallback to cost rate
      );

      const costRate = parseRateConfiguration(
        String(costRateString),
        project.id,
      );
      const billingRate = parseRateConfiguration(
        String(billingRateString),
        project.id,
      );

      // For each contractor, create a rate entry for this project
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
    }
  }

  return prefilled;
}
