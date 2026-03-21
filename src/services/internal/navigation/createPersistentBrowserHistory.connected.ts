import { dashboardQuerySchema } from "@/api/tmetric-dashboard-cache/tmetric-dashboard-cache.api";
import { reportQuerySchema } from "@/api/reports/reports.api.ts";
import { myRouting } from "@/routing/myRouting.ts";
import qs from "qs";
import {
  createPersistentBrowserHistory,
  createReadPersisted,
  createStorePersisted,
  localStorageAdapter,
  PatternConfig,
  PersistentNavigationConfig,
} from "./createPersistentBrowserHistory";
import { costQuerySchema } from "@/api/cost/cost.api";
import { clientQuerySchema } from "@/api/clients/clients.api.ts";
import { variableQuerySchema } from "@/api/variable/variable.api";
import { billingQuerySchema } from "@/api/billing/billing.api";
import { projectQuerySchema } from "@/api/project/project.api";
import { workspaceQuerySchema } from "@/api/workspace/workspace.api.ts";


/**
 * Factory function to create a pattern config for workspace-client scoped routes
 */
function createWorkspaceClientPatternConfig<T extends object>(
  pattern: string,
  storageKeySuffix: string,
  querySchema: { parse: (data: unknown) => T },
): PatternConfig<T> {
  return {
    pattern,
    scopeParamNames: ["workspaceId", "clientId"],
    parseQueryParams: (search: string) => {
      const searchWithoutPrefix = search.startsWith("?")
        ? search.slice(1)
        : search;
      const params = qs.parse(searchWithoutPrefix, {
        allowDots: true,
        plainObjects: true,
        ignoreQueryPrefix: true,
        allowEmptyArrays: true,
        strictNullHandling: true,
      });
      return querySchema.parse(params);
    },
    serializeQueryParams: (params: T) => {
      return qs.stringify(params, {
        allowDots: true,
        encode: true,
        allowEmptyArrays: true,
        strictNullHandling: true,
      });
    },
    getStorageKey: (scopeIds: Record<string, string>) => {
      const workspaceId = scopeIds.workspaceId;
      const clientId = scopeIds.clientId;
      return `tracker-persistedQueries-${workspaceId}-${clientId}-${storageKeySuffix}`;
    },
    readPersisted: createReadPersisted<T>(
      localStorageAdapter,
      (scopeIds: Record<string, string>) => {
        const workspaceId = scopeIds.workspaceId;
        const clientId = scopeIds.clientId;
        return `tracker-persistedQueries-${workspaceId}-${clientId}-${storageKeySuffix}`;
      },
      (data: unknown) => querySchema.parse(data),
    ),
    storePersisted: createStorePersisted<T>(
      localStorageAdapter,
      (scopeIds: Record<string, string>) => {
        const workspaceId = scopeIds.workspaceId;
        const clientId = scopeIds.clientId;
        return `tracker-persistedQueries-${workspaceId}-${clientId}-${storageKeySuffix}`;
      },
    ),
  };
}

/**
 * Top-level routes with no :workspaceId/:clientId in the path; one localStorage bucket per page.
 */
function createSingletonPathPatternConfig<T extends object>(
  pattern: string,
  storageKey: string,
  querySchema: { parse: (data: unknown) => T },
): PatternConfig<T> {
  const keyForScope = (_scopeIds: Record<string, string>) => storageKey;
  return {
    pattern,
    scopeParamNames: [],
    parseQueryParams: (search: string) => {
      const searchWithoutPrefix = search.startsWith("?")
        ? search.slice(1)
        : search;
      const params = qs.parse(searchWithoutPrefix, {
        allowDots: true,
        plainObjects: true,
        ignoreQueryPrefix: true,
        allowEmptyArrays: true,
        strictNullHandling: true,
      });
      return querySchema.parse(params);
    },
    serializeQueryParams: (params: T) => {
      return qs.stringify(params, {
        allowDots: true,
        encode: true,
        allowEmptyArrays: true,
        strictNullHandling: true,
      });
    },
    getStorageKey: keyForScope,
    readPersisted: createReadPersisted<T>(
      localStorageAdapter,
      keyForScope,
      (data: unknown) => querySchema.parse(data),
    ),
    storePersisted: createStorePersisted<T>(
      localStorageAdapter,
      keyForScope,
    ),
  };
}

/**
 * Configuration for all projects route persistent navigation
 */
const allProjectsPatternConfig = createWorkspaceClientPatternConfig(
  `${myRouting.forWorkspace().forClient().allProjects()}`,
  "projects-all",
  projectQuerySchema,
);

/**
 * Configuration for active projects route persistent navigation
 */
const activeProjectsPatternConfig = createWorkspaceClientPatternConfig(
  `${myRouting.forWorkspace().forClient().activeProjects()}`,
  "projects-active",
  projectQuerySchema,
);

/**
 * Configuration for closed projects route persistent navigation
 */
const closedProjectsPatternConfig = createWorkspaceClientPatternConfig(
  `${myRouting.forWorkspace().forClient().closedProjects()}`,
  "projects-closed",
  projectQuerySchema,
);

/**
 * Configuration for reports route persistent navigation
 */
const reportsPatternConfig = createWorkspaceClientPatternConfig(
  `${myRouting.forWorkspace().forClient().reports()}`,
  "reports",
  reportQuerySchema,
);

/**
 * Configuration for billing route persistent navigation
 */
const billingPatternConfig = createWorkspaceClientPatternConfig(
  `${myRouting.forWorkspace().forClient().charges()}`,
  "billing",
  billingQuerySchema,
);

/**
 * Configuration for costs route persistent navigation
 */
const costsPatternConfig = createWorkspaceClientPatternConfig(
  `${myRouting.forWorkspace().forClient().costs()}`,
  "costs",
  costQuerySchema,
);

/**
 * Configuration for variables route persistent navigation
 */
const variablesPatternConfig = createWorkspaceClientPatternConfig(
  `${myRouting.forWorkspace().forClient().variables()}`,
  "variables",
  variableQuerySchema,
);

const clientsManagePatternConfig = createSingletonPathPatternConfig(
  myRouting.forGlobal().manageClients(),
  "tracker-persistedQueries-manage-clients",
  clientQuerySchema,
);

const workspacesManagePatternConfig = createSingletonPathPatternConfig(
  myRouting.forGlobal().manageWorkspaces(),
  "tracker-persistedQueries-manage-workspaces",
  workspaceQuerySchema,
);

/**
 * Configuration for TMetric Dashboard route persistent navigation (overview and cube share the same query)
 */
const tmetricDashboardPatternConfig = createWorkspaceClientPatternConfig(
  `${myRouting.forWorkspace().forClient().tmetricDashboard()}`,
  "tmetric-dashboard",
  dashboardQuerySchema,
);

const tmetricDashboardCubePatternConfig = createWorkspaceClientPatternConfig(
  `${myRouting.forWorkspace().forClient().tmetricDashboardCube()}`,
  "tmetric-dashboard",
  dashboardQuerySchema,
);

const tmetricDashboardTimelinePatternConfig = createWorkspaceClientPatternConfig(
  `${myRouting.forWorkspace().forClient().tmetricDashboardTimeline()}`,
  "tmetric-dashboard",
  dashboardQuerySchema,
);

const tmetricDashboardContractorPatternConfig =
  createWorkspaceClientPatternConfig(
    `${myRouting.forWorkspace().forClient().tmetricDashboardContractor()}`,
    "tmetric-dashboard",
    dashboardQuerySchema,
  );

/**
 * Tracker persistent navigation configuration
 */
export const trackerPersistentNavigationConfig: PersistentNavigationConfig = {
  patterns: [
    allProjectsPatternConfig,
    activeProjectsPatternConfig,
    closedProjectsPatternConfig,
    reportsPatternConfig,
    billingPatternConfig,
    costsPatternConfig,
    variablesPatternConfig,
    clientsManagePatternConfig,
    workspacesManagePatternConfig,
    tmetricDashboardPatternConfig,
    tmetricDashboardCubePatternConfig,
    tmetricDashboardTimelinePatternConfig,
    tmetricDashboardContractorPatternConfig,
  ],
};

/**
 * Creates tracker browser history with persistent navigation
 */
export const createTrackerPersistentBrowserHistory = () =>
  createPersistentBrowserHistory(trackerPersistentNavigationConfig);
