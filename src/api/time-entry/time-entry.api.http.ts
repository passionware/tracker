import {
  timeEntry$,
  timeEntryFromHttp,
} from "@/api/time-entry/time-entry.api.http.schema";
import type {
  TimeEntryApi,
  TimeEntryQuery,
} from "@/api/time-entry/time-entry.api";
import { parseWithDataError } from "@/platform/zod/parseWithDataError";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const DEFAULT_LIMIT = 200;

export function createTimeEntryApi(client: SupabaseClient): TimeEntryApi {
  return {
    getEntries: async (query) => {
      let request = client
        .from("entry")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(query.limit ?? DEFAULT_LIMIT);
      request = applyEntryFilters(request, query);
      const { data, error } = await request;
      if (error) throw error;
      return parseWithDataError(z.array(timeEntry$), data ?? []).map(
        timeEntryFromHttp,
      );
    },
    getEntry: async (entryId) => {
      const { data, error } = await client
        .from("entry")
        .select("*")
        .eq("id", entryId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return timeEntryFromHttp(parseWithDataError(timeEntry$, data));
    },
    getActiveEntry: async (contractorId) => {
      const { data, error } = await client
        .from("entry")
        .select("*")
        .eq("contractor_id", contractorId)
        .is("stopped_at", null)
        .is("deleted_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return timeEntryFromHttp(parseWithDataError(timeEntry$, data));
    },
  };
}

/**
 * Apply the {@link TimeEntryQuery} filters onto a PostgREST query builder.
 * Kept locally typed via the request parameter to avoid pulling in
 * `@supabase/postgrest-js` as a direct dependency just for the type.
 */
function applyEntryFilters<Q extends QueryWithFilters>(
  request: Q,
  query: TimeEntryQuery,
): Q {
  let q = request;
  if (query.contractorId !== undefined)
    q = q.eq("contractor_id", query.contractorId) as Q;
  if (query.projectId !== undefined)
    q = q.eq("project_id", query.projectId) as Q;
  if (query.clientId !== undefined) q = q.eq("client_id", query.clientId) as Q;
  if (query.workspaceId !== undefined)
    q = q.eq("workspace_id", query.workspaceId) as Q;
  if (query.taskId !== undefined) q = q.eq("task_id", query.taskId) as Q;
  if (query.taskIds !== undefined && query.taskIds.length > 0)
    q = q.in("task_id", query.taskIds) as Q;
  if (query.activityId !== undefined)
    q = q.eq("activity_id", query.activityId) as Q;
  if (query.approvalState !== undefined) {
    q = (
      Array.isArray(query.approvalState)
        ? q.in("approval_state", query.approvalState)
        : q.eq("approval_state", query.approvalState)
    ) as Q;
  }
  if (query.startedFrom !== undefined)
    q = q.gte("started_at", query.startedFrom.toISOString()) as Q;
  if (query.startedTo !== undefined)
    q = q.lt("started_at", query.startedTo.toISOString()) as Q;
  if (!query.includeDeleted) q = q.is("deleted_at", null) as Q;
  if (query.onlyPlaceholders) q = q.eq("is_placeholder", true) as Q;
  if (query.onlyActive) q = q.is("stopped_at", null) as Q;
  return q;
}

interface QueryWithFilters {
  eq: (column: string, value: unknown) => unknown;
  in: (column: string, values: readonly unknown[]) => unknown;
  is: (column: string, value: unknown) => unknown;
  gte: (column: string, value: unknown) => unknown;
  lt: (column: string, value: unknown) => unknown;
}
