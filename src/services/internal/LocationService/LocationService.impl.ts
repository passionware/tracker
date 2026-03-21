import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { myRouting } from "@/routing/myRouting.ts";
import {
  ClientSpec,
  routingUtils,
  WorkspaceSpec,
} from "@/routing/routingUtils.ts";
import { LocationService } from "@/services/internal/LocationService/LocationService.ts";
import { WithNavigationService } from "@/services/internal/NavigationService/NavigationService.ts";
import { maybe, type Maybe } from "@passionware/monads";
import { matchPath, useLocation } from "react-router-dom";

type GlobalRoutes = ReturnType<typeof myRouting.forGlobal>;

type UrlSegmentCodec<T> = {
  fromString: (raw: string) => T;
  toString: (value: Maybe<T>) => string;
};

type SessionStoredSpecSlot<T> = {
  persist: (spec: T) => void;
  read: () => Maybe<T>;
};

/** Read/write one IdSpec slot in sessionStorage (global manage-* routes have no URL segment). */
function createSessionStoredSpecSlot<T>(
  storageKey: string,
  codec: UrlSegmentCodec<T>,
): SessionStoredSpecSlot<T> {
  function persist(spec: T): void {
    if (typeof sessionStorage === "undefined") {
      return;
    }
    sessionStorage.setItem(storageKey, codec.toString(maybe.of(spec)));
  }

  function read(): Maybe<T> {
    if (typeof sessionStorage === "undefined") {
      return maybe.ofAbsent();
    }
    const raw = sessionStorage.getItem(storageKey);
    if (raw == null || raw === "") {
      return maybe.ofAbsent();
    }
    try {
      return maybe.of(codec.fromString(raw));
    } catch {
      return maybe.ofAbsent();
    }
  }

  return { persist, read };
}

const workspaceScopeSlot = createSessionStoredSpecSlot(
  "tracker:lastWorkspaceSlot",
  routingUtils.workspace,
);
const clientScopeSlot = createSessionStoredSpecSlot(
  "tracker:lastClientSlot",
  routingUtils.client,
);

function persistAppScope(ws: WorkspaceSpec, cl: ClientSpec): void {
  workspaceScopeSlot.persist(ws);
  clientScopeSlot.persist(cl);
}

/** Same idea as createPersistentBrowserHistory: splat matches nested URLs, base matches the index. */
function pathnameMatchesPathOrNested(pathname: string, basePath: string): boolean {
  const nestedPattern = `${basePath}/*`;
  return (
    matchPath(nestedPattern, pathname) != null ||
    matchPath(basePath, pathname) != null
  );
}

function pathnameUnderConfiguration(pathname: string, global: GlobalRoutes): boolean {
  return pathnameMatchesPathOrNested(pathname, global.configuration());
}

/** When switching workspace/client on a global admin page, re-navigate to the same section root. */
function globalManagementRemountTarget(
  pathname: string,
  global: GlobalRoutes,
): (() => string) | null {
  if (!pathnameUnderConfiguration(pathname, global)) {
    return null;
  }
  if (pathnameMatchesPathOrNested(pathname, global.manageWorkspaces())) {
    return global.manageWorkspaces;
  }
  if (pathnameMatchesPathOrNested(pathname, global.manageClients())) {
    return global.manageClients;
  }
  return null;
}

function resolveScopedSpecForPathname<T extends WorkspaceSpec | ClientSpec>(
  pathname: string,
  fromUrl: Maybe<T>,
  slot: SessionStoredSpecSlot<T>,
): Maybe<T> {
  if (maybe.isPresent(fromUrl)) {
    slot.persist(fromUrl);
    return fromUrl;
  }
  const global = myRouting.forGlobal();
  if (pathnameUnderConfiguration(pathname, global)) {
    const stored = slot.read();
    return maybe.isPresent(stored)
      ? stored
      : (idSpecUtils.ofAll() as Maybe<T>);
  }
  return maybe.ofAbsent();
}

export function createLocationService(
  config: WithServices<[WithNavigationService]>,
): LocationService {
  function tryPersistCurrentRoute(
    newWorkspaceId: WorkspaceSpec,
    newClientId: ClientSpec,
  ) {
    const { navigationService } = config.services;
    const pathname =
      typeof window !== "undefined" ? window.location.pathname : "";
    const globalR = myRouting.forGlobal();
    const remountGlobal = globalManagementRemountTarget(pathname, globalR);
    if (remountGlobal) {
      persistAppScope(newWorkspaceId, newClientId);
      navigationService.navigate(remountGlobal());
      return;
    }

    const routing = myRouting.forWorkspace().forClient();

    const routesToKeep = [
      "reports",
      "charges",
      "costs",
      "potentialCosts",
      "variables",
      "tmetricDashboardCube",
      "tmetricDashboard",
      "allProjects",
      "activeProjects",
      "closedProjects",
      "projectsRoot",
      "root",
    ] satisfies (keyof typeof routing)[];

    for (const route of routesToKeep) {
      if (navigationService.match(routing[route]() + "/*")) {
        navigationService.navigate(
          myRouting
            .forWorkspace(newWorkspaceId)
            .forClient(newClientId)
            // eslint-disable-next-line no-unexpected-multiline
            [route](),
        );
        return;
      }
    }
    navigationService.navigate(
      myRouting.forWorkspace(newWorkspaceId).forClient(newClientId).root(),
    );
  }

  const api: LocationService = {
    useCurrentClientId: () => {
      const location = useLocation();
      const match = config.services.navigationService.useMatch(
        myRouting.forWorkspace().forClient().root() + "/*",
      );
      const fromUrl = maybe.map(
        match?.params.clientId,
        routingUtils.client.fromString,
      );
      return resolveScopedSpecForPathname(
        location.pathname,
        fromUrl,
        clientScopeSlot,
      );
    },
    getCurrentClientId: () => {
      const pathname =
        typeof window !== "undefined" ? window.location.pathname : "";
      const match = config.services.navigationService.match(
        myRouting.forWorkspace().forClient().root() + "/*",
      );
      const fromUrl = maybe.map(
        match?.params.clientId,
        routingUtils.client.fromString,
      );
      return resolveScopedSpecForPathname(
        pathname,
        fromUrl,
        clientScopeSlot,
      );
    },
    useCurrentWorkspaceId: () => {
      const location = useLocation();
      const match = config.services.navigationService.useMatch(
        myRouting.forWorkspace().root() + "/*",
      );
      const fromUrl = maybe.map(
        match?.params.workspaceId,
        routingUtils.workspace.fromString,
      );
      return resolveScopedSpecForPathname(
        location.pathname,
        fromUrl,
        workspaceScopeSlot,
      );
    },
    getCurrentWorkspaceId: () => {
      const pathname =
        typeof window !== "undefined" ? window.location.pathname : "";
      const match = config.services.navigationService.match(
        myRouting.forWorkspace().root() + "/*",
      );
      const fromUrl = maybe.map(
        match?.params.workspaceId,
        routingUtils.workspace.fromString,
      );
      return resolveScopedSpecForPathname(
        pathname,
        fromUrl,
        workspaceScopeSlot,
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
        myRouting.forWorkspace().forClient().forProject().root() + "/*",
      );
      return maybe.map(match?.params.projectId, parseInt);
    },
    getCurrentProjectId: () => {
      const match = config.services.navigationService.match(
        myRouting.forWorkspace().forClient().forProject().root() + "/*",
      );
      return maybe.map(match?.params.projectId, parseInt);
    },
    useCurrentProjectTab: () => {
      const forProject = myRouting.forWorkspace().forClient().forProject();
      const matchWon = config.services.navigationService.useMatchMany({
        iterations: forProject.iterations() + "/*",
        details: forProject.details() + "/*",
        contractors: forProject.contractors() + "/*",
      });
      return matchWon?.key;
    },
    useCurrentProjectIterationStatus: () => {
      const match = config.services.navigationService.useMatch(
        myRouting.forWorkspace().forClient().forProject().iterations() + "/*",
      );
      return maybe.map(
        match?.params.projectIterationStatus,
        (filter) => filter as "all" | "active" | "closed",
      );
    },
    getCurrentProjectIterationStatus: () => {
      const match = config.services.navigationService.match(
        myRouting.forWorkspace().forClient().forProject().iterations() + "/*",
      );
      return maybe.map(
        match?.params.projectIterationStatus,
        (filter) => filter as "all" | "active" | "closed",
      );
    },
    useCurrentProjectIterationId: () => {
      const match = config.services.navigationService.useMatch(
        myRouting
          .forWorkspace()
          .forClient()
          .forProject()
          .forIteration()
          .root() + "/*",
      );
      return maybe.map(match?.params.iterationId, parseInt);
    },
    useCurrentProjectIterationTab: () => {
      const forIteration = myRouting
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
      const positionsMatch = config.services.navigationService.useMatch(
        forIteration.positions() + "/*",
      );

      switch (true) {
        case !!eventsMatch:
          return "events";
        case !!reportsMatch:
          return "reports";
        case !!billingsMatch:
          return "billings";
        case !!positionsMatch:
          return "positions";
        case !!generatedReportsMatch:
        case !!rootMatch:
          return "generated-reports";
        default:
          return maybe.ofAbsent();
      }
    },
    getCurrentProjectIterationId: () => {
      const match = config.services.navigationService.match(
        myRouting
          .forWorkspace()
          .forClient()
          .forProject()
          .forIteration()
          .root() + "/*",
      );
      return maybe.map(match?.params.iterationId, parseInt);
    },
    getCurrentGeneratedReportId: () => {
      const match = config.services.navigationService.match(
        myRouting
          .forWorkspace()
          .forClient()
          .forProject()
          .forIteration()
          .forGeneratedReport()
          .root() + "/*",
      );
      return maybe.map(match?.params.generatedReportId, parseInt);
    },
    useCurrentGeneratedReportTab: () => {
      const forGeneratedReport = myRouting
        .forWorkspace()
        .forClient()
        .forProject()
        .forIteration()
        .forGeneratedReport();

      const basicMatch = config.services.navigationService.useMatch(
        forGeneratedReport.basic() + "/*",
      );
      const timeEntriesMatch = config.services.navigationService.useMatch(
        forGeneratedReport.timeEntries() + "/*",
      );
      const groupedViewMatch = config.services.navigationService.useMatch(
        forGeneratedReport.groupedView() + "/*",
      );
      const reconciliationMatch = config.services.navigationService.useMatch(
        forGeneratedReport.reconciliation() + "/*",
      );
      const rootMatch = config.services.navigationService.useMatch(
        forGeneratedReport.root() + "/*",
      );

      if (timeEntriesMatch) return "time-entries";
      if (groupedViewMatch) return "grouped-view";
      if (reconciliationMatch) return "reconciliation";
      if (basicMatch) return "basic";
      if (rootMatch) return "basic"; // Default to basic for root path
      return maybe.ofAbsent();
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
