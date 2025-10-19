/**
 * Export Utils
 *
 * Utility functions for anonymizing and processing report data for export.
 */

import type { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";

/**
 * Mandatory preparation step: Add numHours to all time entries.
 * This should be applied to all data before any other processing.
 */
export function prepareTimeEntries(
  report: GeneratedReportSource,
): GeneratedReportSource {
  const preparedEntries = report.data.timeEntries.map((entry) => ({
    ...entry,
    numHours: calculateHours(entry.startAt, entry.endAt),
  }));

  return {
    ...report,
    data: {
      ...report.data,
      timeEntries: preparedEntries,
    },
  };
}

/**
 * Anonymize time entries by grouping identical entries and merging them.
 * Groups entries that have all data identical except start/end markers,
 * then merges them into one entry with numHours instead of startAt/endAt.
 */
export function anonymizeTimeEntries(
  report: GeneratedReportSource,
): GeneratedReportSource {
  const timeEntries = report.data.timeEntries;

  // Group entries by all fields except startAt and endAt
  const groupedEntries = new Map<string, typeof timeEntries>();

  timeEntries.forEach((entry) => {
    // Create a key from all fields except startAt and endAt
    const { startAt, endAt, ...entryWithoutTime } = entry;
    const key = JSON.stringify(entryWithoutTime);

    if (!groupedEntries.has(key)) {
      groupedEntries.set(key, []);
    }
    groupedEntries.get(key)!.push(entry);
  });

  // Merge grouped entries
  const anonymizedEntries = Array.from(groupedEntries.values()).map((group) => {
    if (group.length === 1) {
      // Single entry - just convert to numHours
      const entry = group[0];
      const numHours = calculateHours(entry.startAt, entry.endAt);
      const { startAt, endAt, ...entryWithoutTime } = entry;
      return {
        ...entryWithoutTime,
        numHours,
      } as any; // Type assertion for anonymized entry structure
    } else {
      // Multiple entries - merge them
      const firstEntry = group[0];
      const { startAt, endAt, ...baseEntry } = firstEntry;

      // Calculate total hours from all entries in the group
      const totalHours = group.reduce((sum, entry) => {
        return sum + calculateHours(entry.startAt, entry.endAt);
      }, 0);

      return {
        ...baseEntry,
        numHours: totalHours,
      } as any; // Type assertion for anonymized entry structure
    }
  });

  return {
    ...report,
    data: {
      ...report.data,
      timeEntries: anonymizedEntries as any, // Type assertion for anonymized structure
    },
  };
}

/**
 * Anonymize contractor information by replacing contractorId with 0.
 */
export function anonymizeContractor(
  report: GeneratedReportSource,
): GeneratedReportSource {
  const anonymizedEntries = report.data.timeEntries.map((entry) => ({
    ...entry,
    contractorId: 0,
  }));

  return {
    ...report,
    data: {
      ...report.data,
      timeEntries: anonymizedEntries,
    },
  };
}

/**
 * Calculate hours between start and end timestamps.
 */
function calculateHours(startAt: Date, endAt: Date): number {
  return (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60);
}

/**
 * Apply preparation and anonymization functions to a report.
 * Always includes the mandatory preparation step.
 */
export function applyAnonymization(
  report: GeneratedReportSource,
  options: {
    anonymizeTimeEntries?: boolean;
    anonymizeContractor?: boolean;
  },
): GeneratedReportSource {
  // Always apply mandatory preparation step first
  let result = prepareTimeEntries(report);

  if (options.anonymizeTimeEntries) {
    result = anonymizeTimeEntries(result);
  }

  if (options.anonymizeContractor) {
    result = anonymizeContractor(result);
  }

  return result;
}
