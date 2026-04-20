import { rd } from "@passionware/monads";
import type { WithFrontServices } from "@/core/frontServices.ts";

/**
 * Resolved identity for the tracker UI: "which contractor are we tracking
 * time *as* right now?".
 *
 * The rules, in priority order:
 *   1. **Impersonation override** — when an explicit preference is stored
 *      via `preferenceService.useTrackerActiveContractorId()`. Admins use
 *      this from the tracker bar picker to watch/start entries for another
 *      teammate. The preference wins so that the impersonated contractor
 *      is consistent across every tracker surface (bar, tasks page,
 *      timeline, editor drawer) in a single click.
 *   2. **Auth-mapped contractor** — the contractor paired with the
 *      signed-in Supabase user (`contractor.user_id`). This is the
 *      implicit identity regular teammates use without ever touching the
 *      picker.
 *   3. **Unknown** — the user is not paired with a contractor and hasn't
 *      set the override. UIs render the picker CTA until one of (1)/(2)
 *      resolves.
 *
 * Returning `authContractorId` and `preferenceContractorId` alongside the
 * final `contractorId` lets the tracker bar draw an "Impersonating" badge
 * and offer a one-click "back to me" button without re-deriving the check.
 */
export interface CurrentContractor {
  /** Final resolved contractor id the tracker UI should use. Null when
   *  neither an override nor an auth-pairing is available. */
  contractorId: number | null;
  /** True when the active contractor comes from the explicit preference
   *  AND differs from the signed-in user's own contractor. */
  isImpersonating: boolean;
  /** Contractor the signed-in user is paired with, or null if unpaired. */
  authContractorId: number | null;
  /** Raw preference override. Null when the picker hasn't been used. */
  preferenceContractorId: number | null;
}

export function useCurrentContractor(
  services: WithFrontServices["services"],
): CurrentContractor {
  const authInfo = rd.tryGet(services.authService.useAuth());
  const myContractor = rd.tryGet(
    services.contractorService.useMyContractor(authInfo?.id ?? null),
  );
  const preferenceContractorId =
    services.preferenceService.useTrackerActiveContractorId();

  const authContractorId = myContractor?.id ?? null;
  const contractorId = preferenceContractorId ?? authContractorId;
  const isImpersonating =
    preferenceContractorId !== null &&
    preferenceContractorId !== authContractorId;

  return {
    contractorId,
    isImpersonating,
    authContractorId,
    preferenceContractorId,
  };
}
