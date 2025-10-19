/**
 * Report Cube Transformation
 *
 * ETL transform functions for converting report data into cube-aligned format.
 * This is the main transformation step that enriches data for cube processing.
 */

import type { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { groupBy, sum } from "lodash";

/**
 * Transformed entry with all supported fields for cube processing
 * Some fields are optional to support anonymization scenarios
 */
export interface TransformedEntry {
  // Core fields (always present)
  id: string;
  note: string;
  taskId: string;
  activityId: string;
  projectId: string;
  roleId: string;

  // Optional fields (can be removed during anonymization)
  startAt?: Date;
  endAt?: Date;
  contractorId?: number;

  // Calculated fields (present on not, depending on the export options)
  numHours: number;
  costValue?: number;
  billingValue?: number;
  profitValue?: number;
}

/**
 * Transform report data into cube-aligned format with all calculated values.
 * This is the main ETL transform step that enriches data for easy cube processing.
 */
export function transformReportData(
  report: GeneratedReportSource,
): TransformedEntry[] {
  return report.data.timeEntries.map((entry): TransformedEntry => {
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
      // Core fields (always present)
      id: entry.id,
      note: entry.note,
      taskId: entry.taskId,
      activityId: entry.activityId,
      projectId: entry.projectId,
      roleId: entry.roleId,

      // Optional fields (can be removed during anonymization)
      startAt: entry.startAt,
      endAt: entry.endAt,
      contractorId: entry.contractorId,

      // Calculated fields (always present)
      numHours,
      costValue,
      billingValue,
      profitValue,
    };
  });
}

/**
 * Generic function to merge entries by grouping identical entries and aggregating specified measurements.
 * @param entries - Array of transformed entries to merge
 * @param groupByFields - Fields to use for grouping (entries with same values in these fields will be merged)
 * @param measurements - Object defining which measurements to aggregate and how
 */
export function mergeEntries(
  entries: TransformedEntry[],
  groupByFields: (keyof TransformedEntry)[],
  measurements: {
    [K in keyof TransformedEntry]?: {
      aggregate: (values: any[]) => any;
      defaultValue?: any;
    };
  },
): TransformedEntry[] {
  // Create a grouping function that combines multiple fields
  const groupByFunction = (entry: TransformedEntry) => {
    return groupByFields
      .map((field) => `${field}:${JSON.stringify(entry[field])}`)
      .join("|");
  };

  // Use lodash groupBy for efficient grouping
  const groupedEntries = groupBy(entries, groupByFunction);

  // Merge grouped entries
  return Object.values(groupedEntries).map((group) => {
    if (group.length === 1) {
      // Single entry - return as is
      return group[0];
    } else {
      // Multiple entries - merge them
      const firstEntry = group[0];
      const result = { ...firstEntry };

      // Aggregate specified measurements
      Object.entries(measurements).forEach(([field, config]) => {
        if (config) {
          const values = group
            .map((entry) => entry[field as keyof TransformedEntry])
            .filter((value) => value !== undefined);

          (result as any)[field] =
            values.length > 0 ? config.aggregate(values) : config.defaultValue;
        }
      });

      return result;
    }
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
  const mergedEntries = mergeEntries(
    transformedEntries,
    // Group by all fields except time and calculated values
    [
      "id",
      "note",
      "taskId",
      "activityId",
      "projectId",
      "roleId",
      "contractorId",
    ],
    // Define how to aggregate measurements
    {
      numHours: {
        aggregate: sum,
        defaultValue: 0,
      },
      costValue: {
        aggregate: sum,
        defaultValue: 0,
      },
      billingValue: {
        aggregate: sum,
        defaultValue: 0,
      },
      profitValue: {
        aggregate: sum,
        defaultValue: 0,
      },
    },
  );

  // Explicitly remove time fields after merging
  return mergedEntries.map((entry) => ({
    ...entry,
    startAt: undefined,
    endAt: undefined,
  }));
}

/**
 * Anonymize contractor information by removing contractorId.
 */
export function anonymizeContractor(
  transformedEntries: TransformedEntry[],
): TransformedEntry[] {
  return transformedEntries.map((entry) => ({
    ...entry,
    contractorId: undefined, // Remove contractor information
  }));
}

/**
 * Merge entries by project and task, aggregating all measurements.
 * Useful for project-level reporting.
 */
export function mergeByProjectAndTask(
  transformedEntries: TransformedEntry[],
): TransformedEntry[] {
  return mergeEntries(transformedEntries, ["projectId", "taskId"], {
    numHours: {
      aggregate: sum,
      defaultValue: 0,
    },
    costValue: {
      aggregate: sum,
      defaultValue: 0,
    },
    billingValue: {
      aggregate: sum,
      defaultValue: 0,
    },
    profitValue: {
      aggregate: sum,
      defaultValue: 0,
    },
  });
}

/**
 * Merge entries by contractor, aggregating all measurements.
 * Useful for contractor-level reporting.
 */
export function mergeByContractor(
  transformedEntries: TransformedEntry[],
): TransformedEntry[] {
  return mergeEntries(transformedEntries, ["contractorId"], {
    numHours: {
      aggregate: sum,
      defaultValue: 0,
    },
    costValue: {
      aggregate: sum,
      defaultValue: 0,
    },
    billingValue: {
      aggregate: sum,
      defaultValue: 0,
    },
    profitValue: {
      aggregate: sum,
      defaultValue: 0,
    },
  });
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
    activeMeasures?: string[];
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

  // Filter out unselected measurement fields
  if (options.activeMeasures) {
    transformedEntries = filterUnselectedMeasurements(
      transformedEntries,
      options.activeMeasures,
    );
  }

  return transformedEntries;
}

/**
 * Filter out unselected measurement fields from transformed entries.
 */
function filterUnselectedMeasurements(
  entries: TransformedEntry[],
  activeMeasures: string[],
): TransformedEntry[] {
  // Define measurement field mappings
  const measurementFields = {
    hours: "numHours",
    cost: "costValue",
    billing: "billingValue",
    profit: "profitValue",
    entries: "entries",
  };

  return entries.map((entry) => {
    const filteredEntry = { ...entry };

    // Remove unselected measurement fields
    Object.entries(measurementFields).forEach(([measureId, fieldName]) => {
      if (!activeMeasures.includes(measureId)) {
        delete (filteredEntry as any)[fieldName];
      }
    });

    return filteredEntry;
  });
}

/**
 * Calculate hours between start and end timestamps.
 */
function calculateHours(startAt: Date, endAt: Date): number {
  return (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60);
}
