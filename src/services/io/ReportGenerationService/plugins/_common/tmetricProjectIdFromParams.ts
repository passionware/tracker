/**
 * Resolves the TMetric project ID to use for rate matching for a given contractor.
 * Each contractor may use their own TMetric instance, so the same logical project
 * (by name) can have different TMetric project IDs per contractor.
 *
 * Parameters may contain:
 * - tmetricProjectIdByContractor: Record<string, string> — map contractorId -> TMetric project ID (preferred)
 * - originalProjectId: string — legacy single value (treated as fallback for any contractor)
 */

export function getTmetricProjectIdForContractor(
  parameters: Record<string, unknown> | undefined,
  contractorId: number,
  fallbackProjectId: string,
): string {
  if (!parameters) return fallbackProjectId;
  const byContractor = parameters.tmetricProjectIdByContractor as
    | Record<string, string>
    | undefined;
  if (byContractor && typeof byContractor[String(contractorId)] === "string") {
    return byContractor[String(contractorId)];
  }
  const legacy = parameters.originalProjectId;
  if (typeof legacy === "string") return legacy;
  return fallbackProjectId;
}
