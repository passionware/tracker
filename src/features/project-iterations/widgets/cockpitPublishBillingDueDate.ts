import type { Billing } from "@/api/billing/billing.api.ts";
import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import type { CalendarDate } from "@internationalized/date";
import { orderBy } from "lodash";

export type CockpitPublishBillingDueContext = {
  iterationId: ProjectIteration["id"];
  periodEnd: ProjectIteration["periodEnd"];
  defaultBillingDueDays: number;
};

/**
 * Picks a payment due date to embed when publishing a cube report to the client cockpit:
 * prefers `due_date` on billings linked to this iteration; otherwise iteration end + project default offset.
 */
export function resolveCockpitPublishBillingDueDate(
  billings: Billing[],
  ctx: CockpitPublishBillingDueContext,
): CalendarDate {
  const linked = billings.filter((b) =>
    b.linkBillingReport.some(
      (l) => l.report?.projectIterationId === ctx.iterationId,
    ),
  );

  if (linked.length > 0) {
    const withExplicitDue = linked.filter((b) => b.dueDate != null);
    const pool = withExplicitDue.length > 0 ? withExplicitDue : linked;
    const best = orderBy(
      pool,
      [(b) => b.invoiceDate.toString()],
      ["desc"],
    )[0];
    if (best?.dueDate) {
      return best.dueDate;
    }
    // Linked billings exist but none have due_date set — use project default from period end.
  }

  const days = Number.isFinite(ctx.defaultBillingDueDays)
    ? Math.max(0, Math.floor(ctx.defaultBillingDueDays))
    : 14;
  return ctx.periodEnd.add({ days });
}
