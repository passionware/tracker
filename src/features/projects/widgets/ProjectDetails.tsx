import { myRouting } from "@/routing/myRouting.ts";
import { Project } from "@/api/project/project.api.ts";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import {
  ActionMenu,
  ActionMenuDeleteItem,
  ActionMenuEditItem,
} from "@/features/_common/ActionMenu.tsx";
import { useEntityDrawerContext } from "@/features/_common/drawers/entityDrawerContext.tsx";
import { ClientWidget } from "@/features/_common/elements/pickers/ClientView.tsx";
import { WorkspaceWidget } from "@/features/_common/elements/pickers/WorkspaceView";
import { renderError } from "@/features/_common/renderError.tsx";
import { projectPayloadFromProject } from "@/features/projects/projectPayload.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/routing/routingUtils.ts";
import { rd } from "@passionware/monads";
import { ChevronRight } from "lucide-react";

export function ProjectDetails(
  props: WithFrontServices & {
    projectId: Project["id"];
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  const { pushEntityDrawer } = useEntityDrawerContext();
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
                        myRouting
                          .forWorkspace(props.workspaceId)
                          .forClient(props.clientId)
                          .projectsRoot(),
                      );
                    }}
                  >
                    Delete project
                  </ActionMenuDeleteItem>
                  <ActionMenuEditItem
                    onClick={() =>
                      pushEntityDrawer({
                        type: "project-form",
                        projectId: project.id,
                        defaultValues: projectPayloadFromProject(project),
                      })
                    }
                  >
                    Edit project details
                  </ActionMenuEditItem>
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
