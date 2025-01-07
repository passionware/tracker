import { Client } from "@/api/clients/clients.api.ts";
import { Workspace } from "@/api/workspace/workspace.api.ts";
import { Maybe } from "@passionware/monads";

/**
 * LocationService is responsible for managing the current client id and other location-related state.
 */
export interface LocationService {
  useCurrentClientId: () => Maybe<Client["id"]>;
  useCurrentWorkspaceId: () => Maybe<Workspace["id"]>;
  getCurrentClientId: () => Maybe<Client["id"]>;
  getCurrentWorkspaceId: () => Maybe<Workspace["id"]>;
  changeCurrentClientId: (id: Client["id"]) => void;
}
export interface WithLocationService {
  locationService: LocationService;
}
