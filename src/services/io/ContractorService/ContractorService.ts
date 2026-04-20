import {
  AuthUserDirectoryEntry,
  Contractor,
  ContractorQuery,
} from "@/api/contractor/contractor.api.ts";
import { Maybe, RemoteData } from "@passionware/monads";

export interface ContractorService {
  useContractors: (query: Maybe<ContractorQuery>) => RemoteData<Contractor[]>;
  useContractor: (id: Maybe<Contractor["id"]>) => RemoteData<Contractor>;
  /**
   * Returns the contractor row whose `authUserId` matches the auth user
   * passed in, or `null` when no such mapping exists (common for admins
   * or users whose contractor row hasn't been paired yet — the admin
   * mapping UI is the fix for that case).
   *
   * Caller-supplies the user id (typically from `authService.useAuth()`)
   * to keep this service decoupled from auth — same pattern as
   * `timeRoleService.useMyRoles(authUserId)`.
   *
   * Prefer this over `preferenceService.useTrackerActiveContractorId()`
   * anywhere you actually mean "me" rather than "the contractor I'm
   * currently tracking time as" (those can diverge when an admin uses
   * the tracker-bar override to file time on behalf of someone else).
   */
  useMyContractor: (
    authUserId: Maybe<string>,
  ) => RemoteData<Contractor | null>;
  /**
   * Admin-only mutation (server-side super_admin check). Pass
   * `authUserId: null` to unlink. Invalidates the contractor cache so
   * subsequent `useMyContractor` / list queries pick up the new mapping.
   */
  setContractorAuthUser: (args: {
    contractorId: Contractor["id"];
    authUserId: string | null;
  }) => Promise<void>;
  /**
   * Admin-only. Feeds the picker in the mapping UI. Gated server-side by
   * the `list_auth_user_directory` RPC, so calling this as a non-admin
   * surfaces an error from the worker — don't render the picker unless
   * `deriveAdminScope(roles).kind === "super_admin"`.
   */
  useAuthUserDirectory: (
    enabled: boolean,
  ) => RemoteData<AuthUserDirectoryEntry[]>;
}

export interface WithContractorService {
  contractorService: ContractorService;
}
