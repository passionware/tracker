/**
 * Role keys are scoped by iteration: `iter_${iterationId}_contractor_${contractorId}`,
 * so the same contractor in different iterations does not overwrite when merging.
 */

const ITER_ROLE_KEY_REGEX = /^iter_(\d+)_contractor_(\d+)$/;

/** Extract iteration ID from a role key. Returns null if the key is not in the expected format. */
export function getIterationIdFromRoleKey(roleKey: string): number | null {
  const m = roleKey.match(ITER_ROLE_KEY_REGEX);
  return m ? Number(m[1]) : null;
}

/** Extract contractor ID from a role key. Returns null if the key is not in the expected format. */
export function getContractorIdFromRoleKey(roleKey: string): number | null {
  const m = roleKey.match(ITER_ROLE_KEY_REGEX);
  return m ? Number(m[2]) : null;
}
