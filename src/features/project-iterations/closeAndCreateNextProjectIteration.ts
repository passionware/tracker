import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import type { MutationService } from "@/services/io/MutationService/MutationService.ts";
import type { IterationTriggerService } from "@/services/io/IterationTriggerService/IterationTriggerService.ts";
import { suggestNextIterationPeriod } from "@/features/project-iterations/suggestNextIterationPeriod.ts";
import { isLatestIterationOnProject } from "@/features/project-iterations/isLatestIterationOnProject.ts";
import type { CalendarDate } from "@internationalized/date";

export class CloseAndCreateNextIterationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloseAndCreateNextIterationError";
  }
}

export async function closeAndCreateNextProjectIteration(args: {
  mutationService: MutationService;
  iterationTriggerService: Pick<
    IterationTriggerService,
    "getCurrentBudgetTarget"
  >;
  /** All iterations for the project (same cache as list/detail). */
  projectIterations: readonly ProjectIteration[];
  iteration: ProjectIteration;
  invoiceDates?: readonly CalendarDate[];
}): Promise<{ newIterationId: ProjectIteration["id"] }> {
  const { iteration, projectIterations, mutationService, iterationTriggerService } =
    args;

  if (iteration.status === "closed") {
    throw new CloseAndCreateNextIterationError(
      "This iteration is already closed.",
    );
  }

  if (!isLatestIterationOnProject(projectIterations, iteration)) {
    throw new CloseAndCreateNextIterationError(
      "Only the latest iteration (highest ordinal) on this project can be closed this way.",
    );
  }

  const nextOrdinal =
    Math.max(
      ...projectIterations
        .filter((i) => i.projectId === iteration.projectId)
        .map((i) => i.ordinalNumber),
      0,
    ) + 1;

  const { periodStart, periodEnd } = suggestNextIterationPeriod({
    periodStart: iteration.periodStart,
    periodEnd: iteration.periodEnd,
    invoiceDates: args.invoiceDates,
  });

  const budgetTarget =
    await iterationTriggerService.getCurrentBudgetTarget(iteration.id);

  await mutationService.editProjectIteration(iteration.id, { status: "closed" });

  const { id: newIterationId } = await mutationService.createProjectIteration({
    projectId: iteration.projectId,
    periodStart,
    periodEnd,
    status: "active",
    description: null,
    ordinalNumber: nextOrdinal,
    currency: iteration.currency,
  });

  if (budgetTarget != null) {
    await mutationService.logBudgetTargetChange(
      newIterationId,
      budgetTarget,
      undefined,
    );
  }

  return { newIterationId };
}
