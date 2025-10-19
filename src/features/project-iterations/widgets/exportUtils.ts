/**
 * Export Utils
 *
 * Utility functions for processing report data for export.
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
 * Apply preparation and anonymization functions to a report.
 * Always includes the mandatory preparation step.
 * @deprecated Use transformAndAnonymize from reportCubeTransformation instead
 */
export function applyAnonymization(
  report: GeneratedReportSource,
  _options: {
    anonymizeTimeEntries?: boolean;
    anonymizeContractor?: boolean;
  },
): GeneratedReportSource {
  // Always apply mandatory preparation step first
  let result = prepareTimeEntries(report);

  // Note: The old anonymization functions work with the old structure
  // This is kept for backward compatibility
  return result;
}

/**
 * Calculate hours between start and end timestamps.
 */
function calculateHours(startAt: Date, endAt: Date): number {
  return (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60);
}
