import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { PopoverHeader } from "@/components/ui/popover.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import {
  ActionMenu,
  ActionMenuDeleteItem,
  ActionMenuEditItem,
} from "@/features/_common/ActionMenu.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { ProjectBreadcrumbView } from "@/features/_common/elements/breadcrumbs/ProjectBreadcrumb.tsx";
import { ProjectIterationBreadcrumb } from "@/features/_common/elements/breadcrumbs/ProjectIterationBreadcrumb.tsx";
import { ProjectListBreadcrumb } from "@/features/_common/elements/breadcrumbs/ProjectListBreadcrumb.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { ProjectIterationForm } from "@/features/project-iterations/IterationForm.tsx";
import { PositionList } from "@/features/project-iterations/lists/PositionList.tsx";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { rd } from "@passionware/monads";
import { NewPositionPopover } from "./NewPositionPopover";

export function IterationWidget(
  props: WithFrontServices & {
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
    projectId: number;
    projectIterationId: ProjectIteration["id"];
  },
) {
  const projectIteration =
    props.services.projectIterationService.useProjectIterationDetail(
      props.projectIterationId,
    );

  return (
    <CommonPageContainer
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <ProjectListBreadcrumb {...props} />,
        <ProjectBreadcrumbView {...props} />,
        <ProjectIterationBreadcrumb {...props} />,
      ]}
    >
      {rd
        .journey(projectIteration)
        .wait("Loading...")
        .catch(renderError)
        .map((iteration) => (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-row">
                  <div>Details</div>
                  <ActionMenu services={props.services} className="ml-auto">
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
                        <ActionMenuEditItem
                          onSelect={(e) => e.preventDefault()}
                        >
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
                                iteration.id,
                                data,
                              );
                              bag.close();
                            }}
                          />
                        </>
                      )}
                    />
                  </ActionMenu>
                </CardTitle>
                <CardDescription>{iteration.description}</CardDescription>
              </CardHeader>
            </Card>
            <Tabs
              defaultValue="account"
              className="w-full bg-white sticky top-0 z-[100]"
            >
              <TabsList>
                <TabsTrigger value="account">
                  Positions
                  <Badge variant="secondary" size="sm">
                    {iteration.positions.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="password">
                  Reports
                  <Badge variant="warning" size="sm">
                    12
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="billings">
                  Billings
                  <Badge variant="accent1" size="sm">
                    1
                  </Badge>
                </TabsTrigger>
                {rd
                  .journey(projectIteration)
                  .wait(<Skeleton className="w-20 h-4" />)
                  .catch(renderError)
                  .map((projectIteration) => (
                    <NewPositionPopover
                      className="ml-auto"
                      iterationId={projectIteration.id}
                      services={props.services}
                      workspaceId={props.workspaceId}
                      clientId={props.clientId}
                      projectId={props.projectId}
                      currency={projectIteration.currency}
                    />
                  ))}
              </TabsList>
            </Tabs>
            <PositionList iteration={iteration} services={props.services} />
          </div>
        ))}
    </CommonPageContainer>
  );
}
