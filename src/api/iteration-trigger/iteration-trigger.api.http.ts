import { parseWithDataError } from "@/platform/zod/parseWithDataError";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { IterationTriggerApi } from "./iteration-trigger.api";
import {
  budgetTargetLogEntry$,
  budgetTargetLogEntryFromHttp,
} from "./iteration-trigger.api.http.schema";

export function createIterationTriggerApi(
  client: SupabaseClient,
): IterationTriggerApi {
  return {
    getLog: async (iterationId) => {
      const { data, error } = await client
        .from("project_iteration_budget_target_log")
        .select("*")
        .eq("project_iteration_id", iterationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const entries = parseWithDataError(
        z.array(budgetTargetLogEntry$),
        data ?? [],
      ).map((row) => budgetTargetLogEntryFromHttp(row));
      return entries.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
    },
    getCurrentBudgetTarget: async (iterationId) => {
      const { data, error } = await client
        .from("project_iteration_budget_target_log")
        .select("new_target_amount")
        .eq("project_iteration_id", iterationId)
        .not("new_target_amount", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.new_target_amount ?? null;
    },
  };
}
