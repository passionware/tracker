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
      "activeProjects",
      "closedProjects",
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
            // eslint-disable-next-line no-unexpected-multiline
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
    useCurrentProjectTab: () => {
      const forProject = config.services.routingService
        .forWorkspace()
        .forClient()
        .forProject();
      const matchWon = config.services.navigationService.useMatchMany({
        iterations: forProject.iterations() + "/*",
        details: forProject.details() + "/*",
        contractors: forProject.contractors() + "/*",
      });
      return matchWon?.key;
    },
    useCurrentProjectIterationStatus: () => {
      const match = config.services.navigationService.useMatch(
        config.services.routingService
          .forWorkspace()
          .forClient()
          .forProject()
          .iterations() + "/*",
      );
      return maybe.map(
        match?.params.projectIterationStatus,
        (filter) => filter as "all" | "active" | "closed",
      );
    },
    getCurrentProjectIterationStatus: () => {
      const match = config.services.navigationService.match(
        config.services.routingService
          .forWorkspace()
          .forClient()
          .forProject()
          .iterations() + "/*",
      );
      return maybe.map(
        match?.params.projectIterationStatus,
        (filter) => filter as "all" | "active" | "closed",
      );
    },
    useCurrentProjectIterationId: () => {
      const match = config.services.navigationService.useMatch(
        config.services.routingService
          .forWorkspace()
          .forClient()
          .forProject()
          .forIteration()
          .root() + "/*",
      );
      return maybe.map(match?.params.iterationId, parseInt);
    },
    useCurrentProjectIterationTab: () => {
      const forIteration = config.services.routingService
        .forWorkspace()
        .forClient()
        .forProject()
        .forIteration();
      const rootMatch = config.services.navigationService.useMatch(
        forIteration.root() + "/*",
      );
      const reportsMatch = config.services.navigationService.useMatch(
        forIteration.reports() + "/*",
      );
      const billingsMatch = config.services.navigationService.useMatch(
        forIteration.billings() + "/*",
      );
      const eventsMatch = config.services.navigationService.useMatch(
        forIteration.events() + "/*",
      );
      const generatedReportsMatch = config.services.navigationService.useMatch(
        forIteration.generatedReports() + "/*",
      );

      switch (true) {
        case !!eventsMatch:
          return "events";
        case !!reportsMatch:
          return "reports";
        case !!billingsMatch:
          return "billings";

        case !!generatedReportsMatch:
          return "generated-reports";
        case !!rootMatch:
          return "positions";
        default:
          return maybe.ofAbsent();
      }
    },
    getCurrentProjectIterationId: () => {
      const match = config.services.navigationService.match(
        config.services.routingService
          .forWorkspace()
          .forClient()
          .forProject()
          .forIteration()
          .root() + "/*",
      );
      return maybe.map(match?.params.iterationId, parseInt);
    },
    Resolver: (props) => {
      const workspaceId = api.useCurrentWorkspaceId();

      const clientId = api.useCurrentClientId();
      const projectId = api.useCurrentProjectId();
      const projectIterationStatus = api.useCurrentProjectIterationStatus();
      const projectIterationId = api.useCurrentProjectIterationId();
      const projectIterationTab = api.useCurrentProjectIterationTab();

      return props.children({
        workspaceId,
        clientId,
        projectId,
        projectIterationStatus,
        projectIterationId,
        projectIterationTab,
      });
    },
  };
  return api;
}
