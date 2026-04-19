import {
  taskActuals$,
  taskActualsFromHttp,
  taskDefinition$,
  taskDefinitionFromHttp,
} from "@/api/task-definition/task-definition.api.http.schema";
import type { TaskDefinitionApi } from "@/api/task-definition/task-definition.api";
import { parseWithDataError } from "@/platform/zod/parseWithDataError";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const DEFAULT_LIMIT = 200;
const DEFAULT_SUGGESTIONS_LIMIT = 25;

export function createTaskDefinitionApi(
  client: SupabaseClient,
): TaskDefinitionApi {
  return {
    getTasks: async (query) => {
      let request = client
        .from("task_current")
        .select("*")
        .order("name", { ascending: true })
        .limit(query.limit ?? DEFAULT_LIMIT);
      if (query.projectId !== undefined)
        request = request.eq("project_id", query.projectId);
      if (query.clientId !== undefined)
        request = request.eq("client_id", query.clientId);
      if (!query.includeArchived) request = request.eq("is_archived", false);
      if (!query.includeCompleted) request = request.is("completed_at", null);
      if (query.assignedToUserId !== undefined)
        request = request.contains("assignees", [query.assignedToUserId]);
      const { data, error } = await request;
      if (error) throw error;
      return parseWithDataError(z.array(taskDefinition$), data ?? []).map(
        taskDefinitionFromHttp,
      );
    },
    getTask: async (taskId) => {
      const { data, error } = await client
        .from("task_current")
        .select("*")
        .eq("id", taskId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return taskDefinitionFromHttp(parseWithDataError(taskDefinition$, data));
    },
    getSuggestionsForContractor: async (contractorAuthUid, opts) => {
      let request = client
        .from("task_current")
        .select("*")
        .eq("is_archived", false)
        .is("completed_at", null)
        .contains("assignees", [contractorAuthUid])
        .order("name", { ascending: true })
        .limit(opts?.limit ?? DEFAULT_SUGGESTIONS_LIMIT);
      if (opts?.projectId !== undefined)
        request = request.eq("project_id", opts.projectId);
      const { data, error } = await request;
      if (error) throw error;
      return parseWithDataError(z.array(taskDefinition$), data ?? []).map(
        taskDefinitionFromHttp,
      );
    },
    getTaskActuals: async (taskId) => {
      const { data, error } = await client
        .from("task_actuals")
        .select("*")
        .eq("task_id", taskId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return taskActualsFromHttp(parseWithDataError(taskActuals$, data));
    },
    getTaskActualsForTasks: async (taskIds) => {
      if (taskIds.length === 0) return [];
      const { data, error } = await client
        .from("task_actuals")
        .select("*")
        .in("task_id", taskIds as readonly string[]);
      if (error) throw error;
      return parseWithDataError(z.array(taskActuals$), data ?? []).map(
        taskActualsFromHttp,
      );
    },
    getActiveTaskForContractor: async (contractorId) => {
      const { data: entryRow, error: entryErr } = await client
        .from("entry")
        .select("task_id")
        .eq("contractor_id", contractorId)
        .is("stopped_at", null)
        .is("deleted_at", null)
        .not("task_id", "is", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (entryErr) throw entryErr;
      if (!entryRow?.task_id) return null;
      const { data, error } = await client
        .from("task_current")
        .select("*")
        .eq("id", entryRow.task_id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return taskDefinitionFromHttp(parseWithDataError(taskDefinition$, data));
    },
  };
}
