import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { Project } from "@/api/project/project.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { PopoverHeader } from "@/components/ui/popover.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { ProjectIterationPositionForm } from "@/features/project-iterations/PositionForm.tsx";
import { ClientSpec } from "@/services/front/RoutingService/RoutingService.ts";
import { mt } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Check, Loader2, PlusCircle } from "lucide-react";

export function NewPositionPopover(
  props: WithFrontServices & {
    className?: string;
    projectId: Project["id"];
    iterationId: ProjectIteration["id"];
    clientId: ClientSpec;
    currency: string;
  },
) {
  const promise = promiseState.useMutation(
    props.services.mutationService.createProjectIterationPosition,
  );

  return (
    <InlinePopoverForm
      trigger={
        <Button variant="accent1" size="sm" className={props.className}>
          {mt
            .journey(promise.state)
            .initially(<PlusCircle />)
            .during(<Loader2 />)
            .catch(renderSmallError("w-6 h-6"))
            .done(() => (
              <Check />
            ))}
          Add position
        </Button>
      }
      content={(bag) => (
        <>
          <PopoverHeader>Add iteration position</PopoverHeader>
          <ProjectIterationPositionForm
            currency={props.currency}
            services={props.services}
            mode="create"
            onCancel={bag.close}
            defaultValues={{
              projectIterationId: props.iterationId,
            }}
            onSubmit={async (data) => {
              await promise.track(data);
              bag.close();
            }}
          />
        </>
      )}
    />
  );
}
