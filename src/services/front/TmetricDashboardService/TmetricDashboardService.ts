import {
  TmetricDashboardCacheEntry,
  TmetricDashboardCacheScope,
} from "@/api/tmetric-dashboard-cache/tmetric-dashboard-cache.api";
import type { Maybe, RemoteData } from "@passionware/monads";

export interface ContractorInScope {
  contractorId: number;
  workspaceId: number;
  clientId: number;
}

/** Result of resolving contractors in scope: flat list and per-iteration breakdown. */
export interface ContractorsInScopeResult {
  /** Contractors grouped by iteration id (only when scope has projectIterationIds). */
  byIteration: Map<number, ContractorInScope[]>;
  /** Deduplicated list of all contractors in scope (current behavior). */
  all: ContractorInScope[];
}

export interface ContractorsWithIntegrationStatus {
  /** Full list per (contractor, workspace, client) - used by refreshAndCache */
  integrated: ContractorInScope[];
  nonIntegrated: ContractorInScope[];
  /** Unique contractor IDs for display - each contractor appears once across all clients */
  integratedContractorIds: number[];
  /** Contractors with no integrated context (excluded from refresh) - for display */
  nonIntegratedContractorIds: number[];
}

export interface TmetricDashboardService {
  /**
   * Resolves contractors that match the given scope.
   * Returns byIteration (contractors per iteration id) and all (deduplicated flat list).
   */
  resolveContractorsInScope: (
    scope: TmetricDashboardCacheScope,
  ) => Promise<ContractorsInScopeResult>;

  /**
   * Resolves contractors in scope and splits them by TMetric integration status.
   * Contractors without `tmetric_user` variable are considered non-integrated.
   */
  getContractorsInScopeWithIntegrationStatus: (
    scope: TmetricDashboardCacheScope,
  ) => Promise<ContractorsWithIntegrationStatus>;

  /**
   * Fetches TMetric data for the given scope and period,
   * then stores it in the cache. Only contractors with TMetric integration are fetched.
   * Returns the cached report.
   */
  refreshAndCache: (params: {
    scope: TmetricDashboardCacheScope;
    periodStart: Date;
    periodEnd: Date;
  }) => Promise<TmetricDashboardCacheEntry>;

  /**
   * Hook for cached report. Fetches in the background when scope and period are set.
   * Refetches automatically when cache is invalidated (e.g. after refreshAndCache).
   */
  useCached: (params: {
    scope: TmetricDashboardCacheScope;
    periodStart: Date | null;
    periodEnd: Date | null;
  }) => RemoteData<TmetricDashboardCacheEntry>;

  /**
   * Live TMetric activity for integrated contractors on active-iteration projects
   * in the given workspaces (same scope idea as the TMetric dashboard).
   * Refetches periodically while enabled (e.g. popover open).
   */
  useLiveContractorsPanel: (params: {
    workspaceIds: Maybe<number[]>;
    enabled?: boolean;
  }) => RemoteData<TmetricLiveContractorsPanelData>;
}

export interface WithTmetricDashboardService {
  tmetricDashboardService: TmetricDashboardService;
}

/** One contractor row for the live TMetric sidebar panel. */
export interface TmetricLiveContractorRow {
  contractorId: number;
  fullName: string;
  /** Distinct clients where this contractor has TMetric integration in scope (row aggregates all). */
  clientIds: number[];
  /** Active timer from TMetric (endTime null), if any. */
  currentTimer: null | {
    label: string;
    projectName?: string;
    startedAt: Date;
  };
  /** Sum of time overlapping the last 24 hours (includes running timer). */
  last24hHours: number;
  /** Completed entries in the last 24h, newest first. */
  recentEntries: Array<{
    id: number;
    label: string;
    projectName?: string;
    startTime: Date;
    endTime: Date;
    durationHours: number;
  }>;
  /** Present when this contractor’s TMetric fetch failed. */
  error?: string;
}

export interface TmetricLiveContractorsPanelData {
  fetchedAt: Date;
  rows: TmetricLiveContractorRow[];
  /** Aggregates across returned rows (ignores rows with errors for hours). */
  summary: {
    integratedContractors: number;
    totalHoursLast24h: number;
    activeTimers: number;
  };
}
