/**
 * Report Cube Transformation
 *
 * ETL transform functions for converting report data into cube-aligned format.
 * This is the main transformation step that enriches data for cube processing.
 */

import type { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { getMatchingRate } from "@/services/io/_common/getMatchingRate";
import { groupBy, sum } from "lodash";

/**
 * Transformed entry with all supported fields for cube processing
 * Some fields are optional to support anonymization scenarios
 */
export interface TransformedEntry {
  // Core fields (always present)
  id: string;
  note: string | null;
  taskId: string;
  activityId: string;
  projectId: string;

  // Optional fields (can be removed during anonymization)
  startAt?: Date;
  endAt?: Date;
  contractorId?: number;
  roleId?: string;

  // Calculated fields (present on not, depending on the export options)
  numHours: number;
  costValue?: number;
  billingValue?: number;
  profitValue?: number;
  hourlyRate?: number; // costValue / numHours (average rate per hour)
}

/**
 * Transform report data into cube-aligned format with all calculated values.
 * This is the main ETL transform step that enriches data for easy cube processing.
 */
export function transformReportData(
  report: GeneratedReportSource,
  options?: {
    anonymizationRules?: Array<{
      id: string;
      projectIds: string[];
      anonymizedContractorName: string;
    }>; // Array of anonymization rules
  },
): TransformedEntry[] {
  // Build a map from project ID to anonymized contractor ID
  const projectToAnonymizedContractorId = new Map<string, number>();
  if (options?.anonymizationRules) {
    options.anonymizationRules.forEach((rule, index) => {
      // Use negative IDs starting from -999, -998, etc. for each rule
      const anonymizedContractorId = -999 - index;
      rule.projectIds.forEach((projectId) => {
        projectToAnonymizedContractorId.set(projectId, anonymizedContractorId);
      });
    });
  }

  return report.data.timeEntries.map((entry): TransformedEntry => {
    // Calculate hours
    const numHours = calculateHours(entry.startAt, entry.endAt);

    // Find matching rate for cost/billing calculations
    const matchingRate = getMatchingRate(report.data, entry);

    // Calculate financial values
    const costValue = numHours * matchingRate.costRate;
    const billingValue = numHours * matchingRate.billingRate;
    const profitValue = billingValue - costValue;
    // Calculate hourly rate (cost per hour)
    const hourlyRate = numHours > 0 ? billingValue / numHours : 0;

    // Anonymize contractorId if project matches a rule
    let contractorId = entry.contractorId;
    const anonymizedId = projectToAnonymizedContractorId.get(entry.projectId);
    if (anonymizedId !== undefined) {
      contractorId = anonymizedId;
    }

    return {
      // Core fields (always present)
      id: entry.id,
      note: entry.note,
      taskId: entry.taskId,
      activityId: entry.activityId,
      projectId: entry.projectId,

      // Optional fields (can be removed during anonymization)
      startAt: entry.startAt,
      endAt: entry.endAt,
      contractorId,
      roleId: entry.roleId,

      // Calculated fields (always present)
      numHours,
      costValue,
      billingValue,
      profitValue,
      hourlyRate,
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
      "contractorId",
      "roleId",
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
    anonymizationRules?: Array<{
      id: string;
      projectIds: string[];
      anonymizedContractorName: string;
    }>;
    activeMeasures?: string[];
  },
): TransformedEntry[] {
  // Transform data with all calculated values
  let transformedEntries = transformReportData(report, {
    anonymizationRules: options.anonymizationRules,
  });

  if (options.anonymizeTimeEntries) {
    transformedEntries = anonymizeTimeEntries(transformedEntries);
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
    hourlyRate: "hourlyRate",
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
 * Filter out fields for inactive dimensions from transformed entries.
 * This ensures we don't expose sensitive data when dimensions are not active.
 */
export function filterInactiveDimensionFields(
  entries: TransformedEntry[],
  activeDimensionIds: string[],
): TransformedEntry[] {
  const activeDimensionSet = new Set(activeDimensionIds);

  return entries.map((entry) => {
    const filteredEntry: any = {};

    // Always include basic fields
    if (entry.id !== undefined) filteredEntry.id = entry.id;
    if (entry.note !== undefined) filteredEntry.note = entry.note;

    // Include fields based on active dimensions
    if (activeDimensionSet.has("project") && entry.projectId !== undefined) {
      filteredEntry.projectId = entry.projectId;
    }
    if (activeDimensionSet.has("task") && entry.taskId !== undefined) {
      filteredEntry.taskId = entry.taskId;
    }
    if (activeDimensionSet.has("activity") && entry.activityId !== undefined) {
      filteredEntry.activityId = entry.activityId;
    }
    if (
      activeDimensionSet.has("contractor") &&
      entry.contractorId !== undefined
    ) {
      filteredEntry.contractorId = entry.contractorId;
    }
    if (activeDimensionSet.has("role") && entry.roleId !== undefined) {
      filteredEntry.roleId = entry.roleId;
    }
    if (activeDimensionSet.has("date") && entry.startAt !== undefined) {
      filteredEntry.startAt = entry.startAt;
      filteredEntry.endAt = entry.endAt;
    }

    // Always include measure fields
    if (entry.numHours !== undefined) filteredEntry.numHours = entry.numHours;
    if (entry.costValue !== undefined)
      filteredEntry.costValue = entry.costValue;
    if (entry.billingValue !== undefined)
      filteredEntry.billingValue = entry.billingValue;
    if (entry.profitValue !== undefined)
      filteredEntry.profitValue = entry.profitValue;
    if (entry.hourlyRate !== undefined)
      filteredEntry.hourlyRate = entry.hourlyRate;

    return filteredEntry;
  });
}

/**
 * Comprehensive anonymization that only includes fields used by:
 * - Dimension definitions (for grouping/filtering)
 * - Measurement definitions (for calculations)
 * - Raw data (listView) definitions (for display)
 */
export function anonymizeByUsage(
  entries: TransformedEntry[],
  options: {
    dimensions: Array<{ id: string; getValue: (item: any) => any }>;
    measures: Array<{ id: string; getValue: (item: any) => any }>;
    listViewColumns: Array<{ fieldName: string }>;
  },
): TransformedEntry[] {
  // Collect all field names that are actually used
  const usedFields = new Set<string>();

  // Add fields used by dimensions
  options.dimensions.forEach((dimension) => {
    // For each dimension, we need to check what field it accesses
    // This is a simplified approach - in practice, you'd need to analyze the getValue function
    const dimensionFieldMap: Record<string, string> = {
      project: "projectId",
      task: "taskId",
      activity: "activityId",
      contractor: "contractorId",
      role: "roleId",
      date: "startAt", // date dimension typically uses startAt
    };

    const fieldName = dimensionFieldMap[dimension.id];
    if (fieldName) {
      usedFields.add(fieldName);
    }
  });

  // Add fields used by measures
  options.measures.forEach((measure) => {
    const measureFieldMap: Record<string, string> = {
      hours: "numHours",
      cost: "costValue",
      billing: "billingValue",
      profit: "profitValue",
      hourlyRate: "hourlyRate",
    };

    const fieldName = measureFieldMap[measure.id];
    if (fieldName) {
      usedFields.add(fieldName);
    }
  });

  // Add fields used by listView columns
  options.listViewColumns.forEach((column) => {
    usedFields.add(column.fieldName);
  });

  // Always include basic fields
  usedFields.add("id");
  usedFields.add("note");

  // Filter entries to only include used fields
  return entries.map((entry) => {
    const filteredEntry: any = {};

    // Only include fields that are actually used
    Object.keys(entry).forEach((key) => {
      if (usedFields.has(key)) {
        filteredEntry[key] = (entry as any)[key];
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
