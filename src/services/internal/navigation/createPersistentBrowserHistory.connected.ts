import qs from "qs";
import { createRoutingService } from "@/services/front/RoutingService/RoutingService.impl";
import { billingQuerySchema } from "@/api/billing/billing.api";
import { costQuerySchema } from "@/api/cost/cost.api";
import { projectQuerySchema } from "@/api/project/project.api";
import { reportQuerySchema } from "@/api/reports/reports.api.ts";
import { variableQuerySchema } from "@/api/variable/variable.api";
import {
  createPersistentBrowserHistory,
  PatternConfig,
  PersistentNavigationConfig,
  localStorageAdapter,
  createReadPersisted,
  createStorePersisted,
} from "./createPersistentBrowserHistory";

const routingService = createRoutingService();

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
      });
      return querySchema.parse(params);
    },
    serializeQueryParams: (params: T) => {
      return qs.stringify(params, {
        allowDots: true,
        encode: true,
        allowEmptyArrays: true,
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
 * Configuration for all projects route persistent navigation
 */
const allProjectsPatternConfig = createWorkspaceClientPatternConfig(
  `${routingService.forWorkspace().forClient().allProjects()}`,
  "projects-all",
  projectQuerySchema,
);

/**
 * Configuration for active projects route persistent navigation
 */
const activeProjectsPatternConfig = createWorkspaceClientPatternConfig(
  `${routingService.forWorkspace().forClient().activeProjects()}`,
  "projects-active",
  projectQuerySchema,
);

/**
 * Configuration for closed projects route persistent navigation
 */
const closedProjectsPatternConfig = createWorkspaceClientPatternConfig(
  `${routingService.forWorkspace().forClient().closedProjects()}`,
  "projects-closed",
  projectQuerySchema,
);

/**
 * Configuration for reports route persistent navigation
 */
const reportsPatternConfig = createWorkspaceClientPatternConfig(
  `${routingService.forWorkspace().forClient().reports()}`,
  "reports",
  reportQuerySchema,
);

/**
 * Configuration for billing route persistent navigation
 */
const billingPatternConfig = createWorkspaceClientPatternConfig(
  `${routingService.forWorkspace().forClient().charges()}`,
  "billing",
  billingQuerySchema,
);

/**
 * Configuration for costs route persistent navigation
 */
const costsPatternConfig = createWorkspaceClientPatternConfig(
  `${routingService.forWorkspace().forClient().costs()}`,
  "costs",
  costQuerySchema,
);

/**
 * Configuration for variables route persistent navigation
 */
const variablesPatternConfig = createWorkspaceClientPatternConfig(
  `${routingService.forWorkspace().forClient().variables()}`,
  "variables",
  variableQuerySchema,
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
  ],
};

/**
 * Creates tracker browser history with persistent navigation
 */
export const createTrackerPersistentBrowserHistory = () =>
  createPersistentBrowserHistory(trackerPersistentNavigationConfig);
