import type { BudgetTargetLogEntry } from "@/api/iteration-trigger/iteration-trigger.api";
import camelcaseKeys from "camelcase-keys";
import { z } from "zod";

/** Zod schema for project_iteration_budget_target_log row from HTTP/DB. */
export const budgetTargetLogEntry$ = z.object({
  id: z.number(),
  project_iteration_id: z.number(),
  new_target_amount: z.number().nullable(),
  billing_snapshot_amount: z.number().nullable(),
  billing_snapshot_currency: z.string().nullable(),
  created_at: z.coerce.date(),
});
export type BudgetTargetLogEntry$ = z.infer<typeof budgetTargetLogEntry$>;

export function budgetTargetLogEntryFromHttp(
  row: BudgetTargetLogEntry$,
): BudgetTargetLogEntry {
  return camelcaseKeys(row) as unknown as BudgetTargetLogEntry;
}
