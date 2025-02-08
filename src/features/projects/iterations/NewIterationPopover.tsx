import { Project } from "@/api/project/project.api.ts";
import { Button } from "@/components/ui/button.tsx";
import { PopoverHeader } from "@/components/ui/popover.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { ProjectIterationForm } from "@/features/projects/iterations/IterationForm.tsx";
import { delay } from "@/platform/lang/delay.ts";
import { mt } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Check, Loader2, PlusCircle } from "lucide-react";

export function NewIterationPopover(
  props: WithFrontServices & {
    className?: string;
    projectId: Project["id"];
  },
) {
  const promise = promiseState.useMutation(
    props.services.mutationService.createProjectIteration,
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
              status: "draft",
            }}
            onSubmit={(data) =>
              promise
                .track(data)
                .then(bag.close)
                .then(() => delay(2000).then(promise.reset))
            }
          />
        </>
      )}
    />
  );
}
