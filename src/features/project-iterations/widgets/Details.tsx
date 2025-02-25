import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { Project } from "@/api/project/project.api.ts";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { PopoverHeader } from "@/components/ui/popover.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import {
  ActionMenu,
  ActionMenuDeleteItem,
  ActionMenuEditItem,
} from "@/features/_common/ActionMenu.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { ProjectIterationForm } from "@/features/project-iterations/IterationForm.tsx";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { rd } from "@passionware/monads";

export function Details(
  props: WithFrontServices & {
    projectIterationId: ProjectIteration["id"];
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
    projectId: Project["id"];
  },
) {
  const iteration =
    props.services.projectIterationService.useProjectIterationDetail(
      props.projectIterationId,
    );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-row">
          <div>Project iteration</div>
          <ActionMenu services={props.services} className="ml-auto">
            {rd.tryMap(iteration, (iteration) => (
              <>
                <ActionMenuDeleteItem
                  onClick={async () => {
                    await props.services.mutationService.deleteProjectIteration(
                      iteration.id,
                    );
                    // navigate to the list
                    props.services.navigationService.navigate(
                      props.services.routingService
                        .forWorkspace(props.workspaceId)
                        .forClient(props.clientId)
                        .forProject(props.projectId.toString())
                        .iterations("active"),
                    );
                  }}
                >
                  Delete iteration
                </ActionMenuDeleteItem>
                <InlinePopoverForm
                  trigger={
                    <ActionMenuEditItem onSelect={(e) => e.preventDefault()}>
                      Edit iteration
                    </ActionMenuEditItem>
                  }
                  content={(bag) => (
                    <>
                      <PopoverHeader>Edit project iteration</PopoverHeader>
                      <ProjectIterationForm
                        onCancel={bag.close}
                        mode="edit"
                        defaultValues={iteration}
                        onSubmit={async (data) => {
                          await props.services.mutationService.editProjectIteration(
                            props.projectIterationId,
                            data,
                          );
                          bag.close();
                        }}
                      />
                    </>
                  )}
                />
              </>
            ))}
          </ActionMenu>
        </CardTitle>
        <CardDescription>
          {rd
            .journey(iteration)
            .wait(<Skeleton className="h-[1lh] w-30" />)
            .catch(renderError)
            .map((iteration) => (
              <>
                <p>{iteration.description}</p>
                <p className="mt-2">
                  <strong>Currency: </strong>
                  <span className="font-semibold text-sky-700">
                    {iteration.currency.toUpperCase()} (
                    {props.services.formatService.financial.currencySymbol(
                      iteration.currency,
                    )}
                    )
                  </span>
                </p>
              </>
            ))}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
