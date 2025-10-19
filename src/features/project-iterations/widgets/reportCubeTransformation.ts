/**
 * Report Cube Transformation
 *
 * ETL transform functions for converting report data into cube-aligned format.
 * This is the main transformation step that enriches data for cube processing.
 */

import type { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";

/**
 * Extended report entry with calculated values for cube processing
 */
export type TransformedEntry =
  GeneratedReportSource["data"]["timeEntries"][0] & {
    // Calculated fields added to the original entry
    numHours: number;
    costValue: number;
    billingValue: number;
    profitValue: number;
  };

/**
 * Transform report data into cube-aligned format with all calculated values.
 * This is the main ETL transform step that enriches data for easy cube processing.
 */
export function transformReportData(
  report: GeneratedReportSource,
): TransformedEntry[] {
  return report.data.timeEntries.map((entry) => {
    // Calculate hours
    const numHours = calculateHours(entry.startAt, entry.endAt);

    // Find matching rate for cost/billing calculations
    const roleType = report.data.definitions.roleTypes[entry.roleId];
    const matchingRate =
      roleType?.rates.find(
        (rate) =>
          rate.activityType === entry.activityId &&
          rate.taskType === entry.taskId &&
          (rate.projectId === entry.projectId || !rate.projectId),
      ) || roleType?.rates[0]; // Fallback to first rate

    // Calculate financial values
    const costValue = matchingRate ? numHours * matchingRate.costRate : 0;
    const billingValue = matchingRate ? numHours * matchingRate.billingRate : 0;
    const profitValue = billingValue - costValue;

    return {
      ...entry, // Spread all original fields
      // Add calculated fields
      numHours,
      costValue,
      billingValue,
      profitValue,
    };
  });
}

/**
 * Anonymize transformed entries by grouping identical entries and merging them.
 * Groups entries that have all data identical except start/end markers,
 * then merges them into one entry with aggregated values.
 */
export function anonymizeTimeEntries(
  transformedEntries: TransformedEntry[],
): TransformedEntry[] {
  // Group entries by all fields except startAt, endAt, and calculated values
  const groupedEntries = new Map<string, TransformedEntry[]>();

  transformedEntries.forEach((entry) => {
    // Create a key from all fields except time and calculated values
    const {
      startAt,
      endAt,
      numHours,
      costValue,
      billingValue,
      profitValue,
      ...entryWithoutCalculated
    } = entry;
    const key = JSON.stringify(entryWithoutCalculated);

    if (!groupedEntries.has(key)) {
      groupedEntries.set(key, []);
    }
    groupedEntries.get(key)!.push(entry);
  });

  // Merge grouped entries
  return Array.from(groupedEntries.values()).map((group) => {
    if (group.length === 1) {
      // Single entry - return as is
      return group[0];
    } else {
      // Multiple entries - merge them
      const firstEntry = group[0];
      const {
        startAt,
        endAt,
        numHours,
        costValue,
        billingValue,
        profitValue,
        ...baseEntry
      } = firstEntry;

      // Aggregate calculated values
      const totalHours = group.reduce((sum, entry) => sum + entry.numHours, 0);
      const totalCost = group.reduce((sum, entry) => sum + entry.costValue, 0);
      const totalBilling = group.reduce(
        (sum, entry) => sum + entry.billingValue,
        0,
      );
      const totalProfit = group.reduce(
        (sum, entry) => sum + entry.profitValue,
        0,
      );

      return {
        ...baseEntry,
        startAt: firstEntry.startAt,
        endAt: firstEntry.endAt,
        numHours: totalHours,
        costValue: totalCost,
        billingValue: totalBilling,
        profitValue: totalProfit,
      };
    }
  });
}

/**
 * Anonymize contractor information by replacing contractorId with 0.
 */
export function anonymizeContractor(
  transformedEntries: TransformedEntry[],
): TransformedEntry[] {
  return transformedEntries.map((entry) => ({
    ...entry,
    contractorId: 0,
  }));
}

/**
 * Transform and optionally anonymize report data.
 * This is the main ETL transform step that enriches data for cube processing.
 */
export function transformAndAnonymize(
  report: GeneratedReportSource,
  options: {
    anonymizeTimeEntries?: boolean;
    anonymizeContractor?: boolean;
  },
): TransformedEntry[] {
  // Transform data with all calculated values
  let transformedEntries = transformReportData(report);

  if (options.anonymizeTimeEntries) {
    transformedEntries = anonymizeTimeEntries(transformedEntries);
  }

  if (options.anonymizeContractor) {
    transformedEntries = anonymizeContractor(transformedEntries);
  }

  return transformedEntries;
}

/**
 * Calculate hours between start and end timestamps.
 */
function calculateHours(startAt: Date, endAt: Date): number {
  return (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60);
}
