import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api";
import { Nullable } from "@/platform/typescript/Nullable";

/** One row in the budget target log for an iteration (user changes + billing snapshots e.g. on refresh). */
export interface BudgetTargetLogEntry {
  id: number;
  projectIterationId: ProjectIteration["id"];
  /** Set when user updates the target; null for billing-only snapshots (e.g. TMetric refresh). */
  newTargetAmount: Nullable<number>;
  billingSnapshotAmount: Nullable<number>;
  billingSnapshotCurrency: Nullable<string>;
  createdAt: Date;
}

export interface IterationTriggerApi {
  /** All log entries for the iteration (ordered by created_at asc). Use for history graph. */
  getLog: (iterationId: ProjectIteration["id"]) => Promise<BudgetTargetLogEntry[]>;
  /** Current target = most recent log entry where new_target_amount is not null. */
  getCurrentBudgetTarget: (
    iterationId: ProjectIteration["id"],
  ) => Promise<Nullable<number>>;
}
