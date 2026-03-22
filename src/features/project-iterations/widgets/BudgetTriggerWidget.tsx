import { ProjectIteration } from "@/api/project-iteration/project-iteration.api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WithFrontServices } from "@/core/frontServices";
import { BudgetTargetHistoryChart } from "@/features/_common/budget-target/BudgetTargetHistoryChart";
import { inclusiveCalendarPeriodToEpochRange } from "@/platform/lang/internationalized-date";
import { BudgetTargetLogEditDialog } from "@/features/_common/budget-target/BudgetTargetLogEditDialog";
import { rd } from "@passionware/monads";
import { BudgetTargetForm } from "@/features/project-iterations/widgets/BudgetTargetForm";

export function BudgetTriggerWidget(
  props: WithFrontServices & {
    projectIterationId: ProjectIteration["id"];
  },
) {
  const iteration =
    props.services.projectIterationService.useProjectIterationDetail(
      props.projectIterationId,
    );
  const logEntries = props.services.iterationTriggerService.useBudgetTargetLog(
    props.projectIterationId,
  );

  return rd.tryMap(iteration, (iter) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Budget target</CardTitle>
        <CardDescription>
          Billing target for this iteration. Update to record a new value; chart
          shows history and billing snapshots (e.g. from TMetric refresh).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <BudgetTargetHistoryChart
          logEntries={logEntries}
          iterationCurrency={iter.currency}
          formatService={props.services.formatService}
          periodRange={inclusiveCalendarPeriodToEpochRange(
            iter.periodStart,
            iter.periodEnd,
          )}
        />
        <div className="flex flex-wrap items-center gap-2 pt-5 border-t">
          <BudgetTargetLogEditDialog
            entries={rd.getOrElse(logEntries, () => [])}
            iteration={iter}
            services={props.services}
          />
          <BudgetTargetForm
            services={props.services}
            projectIterationId={props.projectIterationId}
            currency={iter.currency}
            className="flex-1 min-w-0"
          />
        </div>
      </CardContent>
    </Card>
  )) ?? null;
}
