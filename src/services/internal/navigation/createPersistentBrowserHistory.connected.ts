import qs from "qs";
import { createRoutingService } from "@/services/front/RoutingService/RoutingService.impl";
import { projectQuerySchema, ProjectQuery } from "@/api/project/project.api";
import { reportQuerySchema, ReportQuery } from "@/api/reports/reports.api.ts";
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
 * Configuration for all projects route persistent navigation
 */
const allProjectsPatternConfig: PatternConfig<ProjectQuery> = {
  pattern: `${routingService.forWorkspace().forClient().allProjects()}`,
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
    return projectQuerySchema.parse(params);
  },
  serializeQueryParams: (params: ProjectQuery) => {
    return qs.stringify(params, {
      allowDots: true,
      encode: true,
      allowEmptyArrays: true,
    });
  },
  getStorageKey: (scopeIds: Record<string, string>) => {
    const workspaceId = scopeIds.workspaceId;
    const clientId = scopeIds.clientId;
    return `tracker-persistedQueries-${workspaceId}-${clientId}-projects-all`;
  },
  readPersisted: createReadPersisted<ProjectQuery>(
    localStorageAdapter,
    (scopeIds: Record<string, string>) => {
      const workspaceId = scopeIds.workspaceId;
      const clientId = scopeIds.clientId;
      return `tracker-persistedQueries-${workspaceId}-${clientId}-projects-all`;
    },
    (data: unknown) => projectQuerySchema.parse(data),
  ),
  storePersisted: createStorePersisted<ProjectQuery>(
    localStorageAdapter,
    (scopeIds: Record<string, string>) => {
      const workspaceId = scopeIds.workspaceId;
      const clientId = scopeIds.clientId;
      return `tracker-persistedQueries-${workspaceId}-${clientId}-projects-all`;
    },
  ),
};

/**
 * Configuration for active projects route persistent navigation
 */
const activeProjectsPatternConfig: PatternConfig<ProjectQuery> = {
  pattern: `${routingService.forWorkspace().forClient().activeProjects()}`,
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
    return projectQuerySchema.parse(params);
  },
  serializeQueryParams: (params: ProjectQuery) => {
    return qs.stringify(params, {
      allowDots: true,
      encode: true,
      allowEmptyArrays: true,
    });
  },
  getStorageKey: (scopeIds: Record<string, string>) => {
    const workspaceId = scopeIds.workspaceId;
    const clientId = scopeIds.clientId;
    return `tracker-persistedQueries-${workspaceId}-${clientId}-projects-active`;
  },
  readPersisted: createReadPersisted<ProjectQuery>(
    localStorageAdapter,
    (scopeIds: Record<string, string>) => {
      const workspaceId = scopeIds.workspaceId;
      const clientId = scopeIds.clientId;
      return `tracker-persistedQueries-${workspaceId}-${clientId}-projects-active`;
    },
    (data: unknown) => projectQuerySchema.parse(data),
  ),
  storePersisted: createStorePersisted<ProjectQuery>(
    localStorageAdapter,
    (scopeIds: Record<string, string>) => {
      const workspaceId = scopeIds.workspaceId;
      const clientId = scopeIds.clientId;
      return `tracker-persistedQueries-${workspaceId}-${clientId}-projects-active`;
    },
  ),
};

/**
 * Configuration for closed projects route persistent navigation
 */
const closedProjectsPatternConfig: PatternConfig<ProjectQuery> = {
  pattern: `${routingService.forWorkspace().forClient().closedProjects()}`,
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
    return projectQuerySchema.parse(params);
  },
  serializeQueryParams: (params: ProjectQuery) => {
    return qs.stringify(params, {
      allowDots: true,
      encode: true,
      allowEmptyArrays: true,
    });
  },
  getStorageKey: (scopeIds: Record<string, string>) => {
    const workspaceId = scopeIds.workspaceId;
    const clientId = scopeIds.clientId;
    return `tracker-persistedQueries-${workspaceId}-${clientId}-projects-closed`;
  },
  readPersisted: createReadPersisted<ProjectQuery>(
    localStorageAdapter,
    (scopeIds: Record<string, string>) => {
      const workspaceId = scopeIds.workspaceId;
      const clientId = scopeIds.clientId;
      return `tracker-persistedQueries-${workspaceId}-${clientId}-projects-closed`;
    },
    (data: unknown) => projectQuerySchema.parse(data),
  ),
  storePersisted: createStorePersisted<ProjectQuery>(
    localStorageAdapter,
    (scopeIds: Record<string, string>) => {
      const workspaceId = scopeIds.workspaceId;
      const clientId = scopeIds.clientId;
      return `tracker-persistedQueries-${workspaceId}-${clientId}-projects-closed`;
    },
  ),
};

/**
 * Configuration for reports route persistent navigation
 */
const reportsPatternConfig: PatternConfig<ReportQuery> = {
  pattern: `${routingService.forWorkspace().forClient().reports()}`,
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
    return reportQuerySchema.parse(params);
  },
  serializeQueryParams: (params: ReportQuery) => {
    return qs.stringify(params, {
      allowDots: true,
      encode: true,
      allowEmptyArrays: true,
    });
  },
  getStorageKey: (scopeIds: Record<string, string>) => {
    const workspaceId = scopeIds.workspaceId;
    const clientId = scopeIds.clientId;
    return `tracker-persistedQueries-${workspaceId}-${clientId}-reports`;
  },
  readPersisted: createReadPersisted<ReportQuery>(
    localStorageAdapter,
    (scopeIds: Record<string, string>) => {
      const workspaceId = scopeIds.workspaceId;
      const clientId = scopeIds.clientId;
      return `tracker-persistedQueries-${workspaceId}-${clientId}-reports`;
    },
    (data: unknown) => reportQuerySchema.parse(data),
  ),
  storePersisted: createStorePersisted<ReportQuery>(
    localStorageAdapter,
    (scopeIds: Record<string, string>) => {
      const workspaceId = scopeIds.workspaceId;
      const clientId = scopeIds.clientId;
      return `tracker-persistedQueries-${workspaceId}-${clientId}-reports`;
    },
  ),
};

/**
 * Tracker persistent navigation configuration
 */
export const trackerPersistentNavigationConfig: PersistentNavigationConfig = {
  patterns: [
    allProjectsPatternConfig,
    activeProjectsPatternConfig,
    closedProjectsPatternConfig,
    reportsPatternConfig,
  ],
};

/**
 * Creates tracker browser history with persistent navigation
 */
export const createTrackerPersistentBrowserHistory = () =>
  createPersistentBrowserHistory(trackerPersistentNavigationConfig);
