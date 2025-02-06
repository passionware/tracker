import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import {
  routingUtils,
  WithRoutingService,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { LocationService } from "@/services/internal/LocationService/LocationService.ts";
import { WithNavigationService } from "@/services/internal/NavigationService/NavigationService.ts";
import { maybe } from "@passionware/monads";

export function createLocationService(
  config: WithServices<[WithRoutingService, WithNavigationService]>,
): LocationService {
  function tryPersistCurrentRoute(
    newWorkspaceId: WorkspaceSpec,
    newClientId: WorkspaceSpec,
  ) {
    const { routingService, navigationService } = config.services;
    const routing = routingService.forWorkspace().forClient();

    const routesToKeep = [
      "reports",
      "charges",
      "costs",
      "potentialCosts",
      "variables",
      "allProjects",
      "currentProjects",
      "pastProjects",
      "projectsRoot",
      "root",
    ] satisfies (keyof typeof routing)[];

    for (const route of routesToKeep) {
      if (navigationService.match(routing[route]() + "/*")) {
        // we are in the route we want to keep
        navigationService.navigate(
          routingService
            .forWorkspace(newWorkspaceId)
            .forClient(newClientId)
            [route](),
        );
        return;
      }
    }
    navigationService.navigate(
      routingService.forWorkspace(newWorkspaceId).forClient(newClientId).root(),
    );
  }

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
      tryPersistCurrentRoute(
        api.getCurrentWorkspaceId() ?? idSpecUtils.ofAll(),
        id,
      );
    },
    changeCurrentWorkspaceId: (id) => {
      tryPersistCurrentRoute(
        id,
        api.getCurrentClientId() ?? idSpecUtils.ofAll(),
      );
    },
    useCurrentProjectId: () => {
      const match = config.services.navigationService.useMatch(
        config.services.routingService
          .forWorkspace()
          .forClient()
          .forProject()
          .root() + "/*",
      );
      return maybe.map(match?.params.projectId, parseInt);
    },
    getCurrentProjectId: () => {
      const match = config.services.navigationService.match(
        config.services.routingService
          .forWorkspace()
          .forClient()
          .forProject()
          .root() + "/*",
      );
      return maybe.map(match?.params.projectId, parseInt);
    },
  };
  return api;
}
