import { WithServices } from "@/platform/typescript/services.ts";
import { WithRoutingService } from "@/services/front/RoutingService/RoutingService.ts";
import { LocationService } from "@/services/internal/LocationService/LocationService.ts";
import { WithNavigationService } from "@/services/internal/NavigationService/NavigationService.ts";
import { maybe } from "@passionware/monads";

export function createLocationService(
  config: WithServices<[WithRoutingService, WithNavigationService]>,
): LocationService {
  return {
    useCurrentClientId: () => {
      const match = config.services.navigationService.useMatch(
        config.services.routingService.forClient().root() + "/*",
      );
      if (!match) {
        return null;
      }
      return maybe.map(match.params.clientId, (clientId) => {
        const parsed = parseInt(clientId);
        if (isNaN(parsed)) {
          throw new Error("Invalid client ID: " + clientId);
        }
        return parsed;
      });
    },
    getCurrentClientId: () => {
      const match = config.services.navigationService.match(
        config.services.routingService.forClient().root() + "/*",
      );
      if (!match) {
        return null;
      }
      return maybe.map(match.params.clientId, (clientId) => {
        const parsed = parseInt(clientId);
        if (isNaN(parsed)) {
          throw new Error("Invalid client ID: " + clientId);
        }
        return parsed;
      });
    },
    changeCurrentClientId: (id) => {
      config.services.navigationService.navigate(
        config.services.routingService.forClient(id).root(),
      );
    },
  };
}
