import { GenericReport } from "@/services/io/_common/GenericReport";
import { z } from "zod";

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

// Dashboard URL/localStorage query (range + iterations)
export type TimePreset =
  | "today"
  | "this_week"
  | "last_week"
  | "month"
  | "unscoped";

export interface DashboardQuery {
  timePreset: TimePreset;
  iterationIds: number[];
}

const timePresetSchema = z.enum([
  "today",
  "this_week",
  "last_week",
  "month",
  "unscoped",
]);

function coerceIterationIds(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? Number(v) : v))
      .filter((n) => Number.isInteger(n) && n > 0);
  }
  return [];
}

export const dashboardQuerySchema = z
  .object({
    timePreset: z
      .preprocess(
        (v) => (v === "" || v == null ? undefined : v),
        timePresetSchema,
      )
      .default("today"),
    iterationIds: z
      .preprocess(coerceIterationIds, z.array(z.number()))
      .default([]),
  })
  .transform((x): DashboardQuery => ({ timePreset: x.timePreset, iterationIds: x.iterationIds }))
  .catch(() => dashboardQueryUtils.ofDefault());

export const dashboardQueryUtils = {
  ofDefault(): DashboardQuery {
    return { timePreset: "today", iterationIds: [] };
  },
  ensureDefault(query: DashboardQuery): DashboardQuery {
    const parsed = dashboardQuerySchema.safeParse(query);
    if (parsed.success) return parsed.data;
    return dashboardQueryUtils.ofDefault();
  },
};
