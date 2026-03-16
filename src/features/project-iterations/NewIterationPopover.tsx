import { projectIterationQueryUtils } from "@/api/project-iteration/project-iteration.api.ts";
import { Project } from "@/api/project/project.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { PopoverHeader } from "@/components/ui/popover.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { ProjectIterationForm } from "@/features/project-iterations/IterationForm.tsx";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { mt, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Check, Loader2, PlusCircle } from "lucide-react";

export function NewIterationPopover(
  props: WithFrontServices & {
    className?: string;
    projectId: Project["id"];
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  const promise = promiseState.useMutation(
    props.services.mutationService.createProjectIteration,
  );

  const projectIterations =
    props.services.projectIterationService.useProjectIterations(
      projectIterationQueryUtils.getBuilder().build((q) => [
        q.withFilter("projectId", {
          operator: "oneOf",
          value: [props.projectId],
        }),
      ]),
    );

  const lastIteration = rd.map(projectIterations, (iters) => {
    if (iters.length === 0) return null;
    const sorted = [...iters].sort((a, b) => b.ordinalNumber - a.ordinalNumber);
    return sorted[0];
  });
  const lastIterationId = rd.getOrElse(lastIteration, () => null)?.id ?? null;
  /** Pre-fill budget target from previous iteration (undefined when none). */
  const initialTarget = rd.getOrElse(
    props.services.iterationTriggerService.useCurrentBudgetTarget(lastIterationId),
    () => undefined,
  );

  return (
    <InlinePopoverForm
      trigger={
        <Button variant="accent1" size="sm" className="flex">
          {mt
            .journey(promise.state)
            .initially(<PlusCircle />)
            .during(<Loader2 />)
            .catch(renderSmallError("w-6 h-6"))
            .done(() => (
              <Check />
            ))}
          Add iteration
        </Button>
      }
      content={(bag) => (
        <>
          <PopoverHeader>Add project iteration</PopoverHeader>
          <ProjectIterationForm
            mode="create"
            onCancel={bag.close}
            defaultValues={{
              projectId: props.projectId,
              status: "active",
              ordinalNumber:
                (rd.getOrElse(lastIteration, () => null)?.ordinalNumber ?? 0) +
                1,
              budgetTriggerAmount: initialTarget,
            }}
            onSubmit={async (data, _changes, extra) => {
              const response = await promise.track(data);
              if (extra?.budgetTriggerAmount != null) {
                await props.services.mutationService.logBudgetTargetChange(
                  response.id,
                  extra.budgetTriggerAmount,
                  undefined,
                );
              }
              bag.close();
              props.services.navigationService.navigate(
                props.services.routingService
                  .forWorkspace(props.workspaceId)
                  .forClient(props.clientId)
                  .forProject(props.projectId.toString())
                  .forIteration(response.id.toString())
                  .root(),
              );
            }}
          />
        </>
      )}
    />
  );
}
