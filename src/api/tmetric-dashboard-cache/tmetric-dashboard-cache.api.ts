import { GenericReport } from "@/services/io/_common/GenericReport";

export interface TmetricDashboardCacheScope {
  workspaceIds?: number[];
  clientIds?: number[];
  contractorIds?: number[];
  projectIterationIds?: number[] | "all_active";
}

export interface TmetricDashboardCacheEntry {
  id: number;
  createdAt: Date;
  createdBy: string | null;
  periodStart: Date;
  periodEnd: Date;
  scope: TmetricDashboardCacheScope;
  data: GenericReport;
}

export interface TmetricDashboardCacheApi {
  getLatestForScope: (
    scope: TmetricDashboardCacheScope,
    periodStart: Date,
    periodEnd: Date,
  ) => Promise<TmetricDashboardCacheEntry | null>;
  create: (payload: {
    periodStart: Date;
    periodEnd: Date;
    scope: TmetricDashboardCacheScope;
    data: GenericReport;
  }) => Promise<TmetricDashboardCacheEntry>;
}
