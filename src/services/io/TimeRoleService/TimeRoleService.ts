import type { TimeRole, TimeRoleQuery } from "@/api/time-role/time-role.api";
import type { Maybe, RemoteData } from "@passionware/monads";

export interface TimeRoleService {
  useRoles: (query: TimeRoleQuery) => RemoteData<TimeRole[]>;
  /**
   * Roles held by the currently-signed-in user (or `idle` until auth
   * resolves). Convenience wrapper over `useRoles({ userId })`.
   */
  useMyRoles: (userId: Maybe<string>) => RemoteData<TimeRole[]>;
}

export interface WithTimeRoleService {
  timeRoleService: TimeRoleService;
}
