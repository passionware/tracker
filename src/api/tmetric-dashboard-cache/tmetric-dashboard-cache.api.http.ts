import {
  tmetricDashboardCacheEntry$,
  tmetricDashboardCacheEntryFromHttp,
} from "./tmetric-dashboard-cache.api.http.schema";
import { parseWithDataError } from "@/platform/zod/parseWithDataError";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  TmetricDashboardCacheApi,
  TmetricDashboardCacheScope,
} from "./tmetric-dashboard-cache.api";

function scopeToJson(
  scope: TmetricDashboardCacheScope,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (scope.workspaceIds?.length) out.workspaceIds = scope.workspaceIds;
  if (scope.clientIds?.length) out.clientIds = scope.clientIds;
  if (scope.contractorIds?.length) out.contractorIds = scope.contractorIds;
  if (scope.projectIterationIds !== undefined) {
    out.projectIterationIds = scope.projectIterationIds;
  }
  return out;
}

function scopeMatches(
  a: TmetricDashboardCacheScope,
  b: TmetricDashboardCacheScope,
): boolean {
  const jsonA = JSON.stringify(scopeToJson(a));
  const jsonB = JSON.stringify(scopeToJson(b));
  return jsonA === jsonB;
}

export function createTmetricDashboardCacheApi(
  client: SupabaseClient,
): TmetricDashboardCacheApi {
  return {
    getLatestForScope: async (scope, periodStart, periodEnd) => {
      const { data, error } = await client
        .from("tmetric_dashboard_cache")
        .select("*")
        .eq("period_start", periodStart.toISOString().slice(0, 10))
        .eq("period_end", periodEnd.toISOString().slice(0, 10))
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data?.length) return null;

      for (const row of data) {
        const entryScope = row.scope as TmetricDashboardCacheScope;
        if (scopeMatches(entryScope, scope)) {
          return tmetricDashboardCacheEntryFromHttp(
            parseWithDataError(tmetricDashboardCacheEntry$, row),
          );
        }
      }
      return null;
    },

    create: async (payload) => {
      const { data: user } = await client.auth.getUser();
      const { data, error } = await client
        .from("tmetric_dashboard_cache")
        .insert({
          period_start: payload.periodStart.toISOString().slice(0, 10),
          period_end: payload.periodEnd.toISOString().slice(0, 10),
          scope: scopeToJson(payload.scope),
          data: payload.data,
          created_by: user?.user?.id ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return tmetricDashboardCacheEntryFromHttp(
        parseWithDataError(tmetricDashboardCacheEntry$, data),
      );
    },
  };
}
