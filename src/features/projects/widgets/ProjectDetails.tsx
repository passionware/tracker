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
import { ClientWidget } from "@/features/_common/elements/pickers/ClientView.tsx";
import { WorkspaceWidget } from "@/features/_common/elements/pickers/WorkspaceView";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { ProjectForm } from "@/features/projects/_common/ProjectForm.tsx";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { rd } from "@passionware/monads";
import { ChevronRight } from "lucide-react";

export function ProjectDetails(
  props: WithFrontServices & {
    projectId: Project["id"];
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  const project = props.services.projectService.useProject(props.projectId);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-row gap-2 items-center">
          <div className="text-slate-700 font-light">Project:</div>
          <div>
            {rd
              .journey(project)
              .wait(<Skeleton className="h-lh w-30" />)
              .catch(renderError)
              .map((x) => x.name)}
          </div>

          <div className="flex flex-row gap-2">
            {rd
              .journey(project)
              .wait(<Skeleton className="h-lh w-30" />)
              .catch(renderError)
              .map((x) => (
                <>
                  {x.workspaceIds.map((workspaceId) => (
                    <WorkspaceWidget
                      workspaceId={workspaceId}
                      services={props.services}
                      layout="avatar"
                      size="sm"
                    />
                  ))}
                </>
              ))}
            <ChevronRight className="text-slate-400" />
            {rd
              .journey(project)
              .wait(<Skeleton className="h-lh w-30" />)
              .catch(renderError)
              .map((x) => (
                <ClientWidget
                  size="sm"
                  layout="avatar"
                  clientId={x.clientId}
                  services={props.services}
                />
              ))}
          </div>
          <ActionMenu services={props.services} className="ml-auto">
            {rd
              .journey(project)
              .wait(<Skeleton className="h-lh w-30" />)
              .catch(renderError)
              .map((project) => (
                <>
                  <ActionMenuDeleteItem
                    onClick={async () => {
                      await props.services.mutationService.deleteProject(
                        project.id,
                      );
                      // navigate to the list
                      props.services.navigationService.navigate(
                        props.services.routingService
                          .forWorkspace(props.workspaceId)
                          .forClient(props.clientId)
                          .projectsRoot(),
                      );
                    }}
                  >
                    Delete project
                  </ActionMenuDeleteItem>
                  <InlinePopoverForm
                    trigger={
                      <ActionMenuEditItem onSelect={(e) => e.preventDefault()}>
                        Edit project details
                      </ActionMenuEditItem>
                    }
                    content={(bag) => (
                      <>
                        <PopoverHeader>Edit project</PopoverHeader>
                        <ProjectForm
                          services={props.services}
                          onCancel={bag.close}
                          mode="edit"
                          defaultValues={project}
                          onSubmit={async (data) => {
                            await props.services.mutationService.editProject(
                              project.id,
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
            .journey(project)
            .wait(<Skeleton className="h-lh w-30" />)
            .catch(renderError)
            .map((x) => x.description)}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
