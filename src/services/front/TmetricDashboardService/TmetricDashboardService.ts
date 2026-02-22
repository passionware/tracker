import {
  TmetricDashboardCacheEntry,
  TmetricDashboardCacheScope,
} from "@/api/tmetric-dashboard-cache/tmetric-dashboard-cache.api";
import type { RemoteData } from "@passionware/monads";

export interface ContractorInScope {
  contractorId: number;
  workspaceId: number;
  clientId: number;
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
   * Returns (contractorId, workspaceId, clientId) for each contractor
   * so TMetric plugin can fetch their time entries.
   */
  resolveContractorsInScope: (
    scope: TmetricDashboardCacheScope,
  ) => Promise<ContractorInScope[]>;

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
}

export interface WithTmetricDashboardService {
  tmetricDashboardService: TmetricDashboardService;
}
