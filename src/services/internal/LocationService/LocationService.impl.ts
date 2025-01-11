import { WithServices } from "@/platform/typescript/services.ts";
import {
  routingUtils,
  WithRoutingService,
} from "@/services/front/RoutingService/RoutingService.ts";
import { LocationService } from "@/services/internal/LocationService/LocationService.ts";
import { WithNavigationService } from "@/services/internal/NavigationService/NavigationService.ts";
import { maybe } from "@passionware/monads";

export function createLocationService(
  config: WithServices<[WithRoutingService, WithNavigationService]>,
): LocationService {
  const api: LocationService = {
    useCurrentClientId: () => {
      const match = config.services.navigationService.useMatch(
        config.services.routingService.forWorkspace().forClient().root() + "/*",
      );

      return maybe.map(match?.params.clientId, routingUtils.client.fromString);
    },
    getCurrentClientId: () => {
      const match = config.services.navigationService.match(
        config.services.routingService.forWorkspace().forClient().root() + "/*",
      );
      return maybe.map(match?.params.clientId, routingUtils.client.fromString);
    },
    useCurrentWorkspaceId: () => {
      const match = config.services.navigationService.useMatch(
        config.services.routingService.forWorkspace().root() + "/*",
      );
      return maybe.map(
        match?.params.workspaceId,
        routingUtils.workspace.fromString,
      );
    },
    getCurrentWorkspaceId: () => {
      const match = config.services.navigationService.match(
        config.services.routingService.forWorkspace().root() + "/*",
      );
      return maybe.map(
        match?.params.workspaceId,
        routingUtils.workspace.fromString,
      );
    },
    changeCurrentClientId: (id) => {
      config.services.navigationService.navigate(
        config.services.routingService
          .forWorkspace(
            api.getCurrentWorkspaceId() ?? routingUtils.workspace.ofAll(),
          )
          .forClient(id)
          .root(),
      );
    },
  };
  return api;
}
