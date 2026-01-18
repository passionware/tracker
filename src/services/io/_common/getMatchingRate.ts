import { GenericReport, RoleRate } from "./GenericReport";
import { TimeEntry } from "@/features/_common/columns/timeEntry";

/**
 * Calculates the specificity of a rate based on how many filter fields are non-empty.
 * Higher specificity means more specific matching criteria.
 */
function calculateRateSpecificity(rate: RoleRate): number {
  let specificity = 0;
  if (rate.activityTypes.length > 0) specificity++;
  if (rate.taskTypes.length > 0) specificity++;
  if (rate.projectIds.length > 0) specificity++;
  return specificity;
}

/**
 * Checks if a rate matches a time entry.
 * A rate matches if:
 * - activityTypes includes the entry's activityId (or activityTypes is empty)
 * - taskTypes includes the entry's taskId (or taskTypes is empty)
 * - projectIds includes the entry's projectId (or projectIds is empty)
 */
function rateMatchesEntry(rate: RoleRate, entry: TimeEntry): boolean {
  const activityMatches =
    rate.activityTypes.length === 0 ||
    rate.activityTypes.includes(entry.activityId);
  const taskMatches =
    rate.taskTypes.length === 0 || rate.taskTypes.includes(entry.taskId);
  const projectMatches =
    rate.projectIds.length === 0 || rate.projectIds.includes(entry.projectId);

  return activityMatches && taskMatches && projectMatches;
}

/**
 * Finds the most specific matching rate for a time entry.
 * Rates are sorted by specificity (number of non-empty filter arrays),
 * with more specific rates (higher specificity) preferred.
 *
 * @param report - The GenericReport containing role definitions
 * @param entry - The TimeEntry to find a matching rate for
 * @returns The most specific matching RoleRate
 * @throws Error if role type does not exist or no matching rate is found
 */
export function getMatchingRate(
  report: GenericReport,
  entry: TimeEntry,
): RoleRate {
  const roleType = report.definitions.roleTypes[entry.roleId];
  if (!roleType) {
    throw new Error(
      `Role type '${entry.roleId}' not found in report definitions`,
    );
  }

  // Find all matching rates
  const matchingRates = roleType.rates.filter((rate) =>
    rateMatchesEntry(rate, entry),
  );

  if (matchingRates.length === 0) {
    throw new Error(
      `No matching rate found for entry (roleId: ${entry.roleId}, activityId: ${entry.activityId}, taskId: ${entry.taskId}, projectId: ${entry.projectId}). Available rates: ${roleType.rates.length}`,
    );
  }

  // Sort by specificity (descending) - most specific first
  matchingRates.sort((a, b) => {
    const specificityA = calculateRateSpecificity(a);
    const specificityB = calculateRateSpecificity(b);
    return specificityB - specificityA;
  });

  // Return the most specific matching rate
  return matchingRates[0];
}
