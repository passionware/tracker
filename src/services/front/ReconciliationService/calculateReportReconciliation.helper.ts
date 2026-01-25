import { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { Report } from "@/api/reports/reports.api.ts";
import { RoleRate } from "@/services/io/_common/GenericReport.ts";
import { getMatchingRate } from "@/services/io/_common/getMatchingRate.ts";
import {
  ReportReconciliationPreview,
} from "./ReconciliationService.ts";

/**
 * Creates a unique signature for a rate to identify it uniquely
 */
function getRateSignature(rate: RoleRate): string {
  const activityTypes = [...rate.activityTypes].sort().join(",");
  const taskTypes = [...rate.taskTypes].sort().join(",");
  const projectIds = [...rate.projectIds].sort().join(",");
  return `${rate.costRate}-${rate.costCurrency}-${activityTypes}-${taskTypes}-${projectIds}`;
}

/**
 * Creates a unique key for grouping entries by contractor and rate
 */
function getContractorRateKey(contractorId: number, rate: RoleRate): string {
  return `${contractorId}-${getRateSignature(rate)}`;
}

export function calculateReportReconciliation(
  report: GeneratedReportSource,
  projectIteration: ProjectIteration,
  existingReports: Report[],
): ReportReconciliationPreview[] {
  // Group time entries by contractor + rate
  const groupedByContractorRate = new Map<
    string,
    {
      contractorId: number;
      rate: RoleRate;
      entries: typeof report.data.timeEntries;
    }
  >();

  // Process each time entry and group by contractor + rate
  for (const entry of report.data.timeEntries) {
    try {
      const matchingRate = getMatchingRate(report.data, entry);
      const key = getContractorRateKey(entry.contractorId, matchingRate);

      if (!groupedByContractorRate.has(key)) {
        groupedByContractorRate.set(key, {
          contractorId: entry.contractorId,
          rate: matchingRate,
          entries: [],
        });
      }

      groupedByContractorRate.get(key)!.entries.push(entry);
    } catch (error) {
      // Skip entries without matching rates
      console.warn("Skipping entry without matching rate:", error);
    }
  }

  const updates: ReportReconciliationPreview[] = [];

  // Calculate report updates for each contractor + rate group
  for (const [, group] of groupedByContractorRate) {
    // Calculate total hours and cost for this group
    let totalHours = 0;
    let totalCost = 0;

    for (const entry of group.entries) {
      const hours =
        (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);
      totalHours += hours;
      totalCost += hours * group.rate.costRate;
    }

    const netValue = Math.round(totalCost * 100) / 100;
    const quantity = Math.round(totalHours * 100) / 100;
    // Use the unit price directly from the rate definition
    const unitPrice = Math.round(group.rate.costRate * 100) / 100;
    // Calculate billing amounts
    let totalBilling = 0;
    for (const entry of group.entries) {
      const hours =
        (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);
      totalBilling += hours * group.rate.billingRate;
    }
    const billingUnitPrice = Math.round(group.rate.billingRate * 100) / 100;

    // Find existing report for this contractor, rate, and currency
    // We match by contractor, currency, and project iteration
    // Note: We can't match by rate signature since reports don't store that,
    // so we'll match by contractor + currency + unitPrice (which should be unique per rate)
    const existingReport = existingReports.find(
      (r) =>
        r.contractorId === group.contractorId &&
        r.currency === group.rate.costCurrency &&
        r.projectIterationId === report.projectIterationId &&
        // Try to match by unitPrice if available (within small tolerance)
        (r.unitPrice === null ||
          r.unitPrice === undefined ||
          Math.abs((r.unitPrice ?? 0) - unitPrice) < 0.01),
    );

    // Create a readable rate signature for display
    // Resolve names from report definitions
    const activityNames =
      group.rate.activityTypes.length > 0
        ? group.rate.activityTypes
            .map((activityId) => {
              const activityType =
                report.data.definitions.activityTypes[activityId];
              return activityType?.name || activityId;
            })
            .join(", ")
        : null;

    const taskNames =
      group.rate.taskTypes.length > 0
        ? group.rate.taskTypes
            .map((taskId) => {
              const taskType = report.data.definitions.taskTypes[taskId];
              return taskType?.name || taskId;
            })
            .join(", ")
        : null;

    const projectNames =
      group.rate.projectIds.length > 0
        ? group.rate.projectIds
            .map((projectId) => {
              const projectType =
                report.data.definitions.projectTypes[projectId];
              return projectType?.name || projectId;
            })
            .join(", ")
        : null;

    const rateSignature =
      [
        activityNames ? `Activities: ${activityNames}` : null,
        taskNames ? `Tasks: ${taskNames}` : null,
        projectNames ? `Projects: ${projectNames}` : null,
      ]
        .filter(Boolean)
        .join(" | ") || "Default rate";

    const baseFields = {
      contractorId: group.contractorId,
      netValue,
      unit: "h",
      quantity,
      unitPrice,
      currency: group.rate.costCurrency,
      billingUnitPrice,
      billingCurrency: group.rate.billingCurrency,
      rateSignature,
    };

    if (existingReport) {
      // Update existing report
      updates.push({
        ...baseFields,
        type: "update",
        id: existingReport.id,
        payload: {
          netValue,
          unit: "h",
          quantity,
          unitPrice,
          currency: group.rate.costCurrency,
        },
      });
    } else {
      // Create new report (will be filtered out later, but keeping structure for completeness)
      updates.push({
        ...baseFields,
        type: "create",
        payload: {
          contractorId: group.contractorId,
          netValue,
          unit: "h",
          quantity,
          unitPrice,
          currency: group.rate.costCurrency,
          // These will be filled in during execution
          periodStart: projectIteration.periodStart,
          periodEnd: projectIteration.periodEnd,
          clientId: 0, // Will be filled in during execution
          workspaceId: 0, // Will be filled in during execution
          description: `Generated from report #${report.id}`,
          projectIterationId: report.projectIterationId,
        },
      });
    }
  }

  return updates;
}
