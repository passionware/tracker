import { Project } from "@/api/project/project.api.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { OpenState } from "@/features/_common/OpenState.tsx";
import { ProjectForm } from "@/features/projects/_common/ProjectForm.tsx";
import { cn } from "@/lib/utils.ts";
import { ErrorMessageRenderer } from "@/platform/react/ErrorMessageRenderer.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import {
  ClientSpec,
  WithRoutingService,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithNavigationService } from "@/services/internal/NavigationService/NavigationService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithProjectService } from "@/services/io/ProjectService/ProjectService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Trash2 } from "lucide-react";

export interface ProjectConfigurationWidgetProps
  extends WithServices<
    [
      WithMutationService,
      WithProjectService,
      WithClientService,
      WithWorkspaceService,
      WithNavigationService,
      WithRoutingService,
    ]
  > {
  projectId: Project["id"];
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
}
export function ProjectConfigurationWidget(
  props: ProjectConfigurationWidgetProps,
) {
  const project = props.services.projectService.useProject(props.projectId);
  const deletePromise = promiseState.useMutation(
    props.services.mutationService.deleteProject,
  );

  return (
    <div className="flex flex-col gap-8 border border-slate-300 p-10 rounded-xl max-w-4xl self-center my-auto">
      <Label size="lg">Edit project configuration</Label>
      {rd
        .journey(project)
        .wait(<Skeleton className="h-96" />)
        .catch((error) => (
          <div className={cn("rounded-md border p-4 text-red-600")}>
            <ErrorMessageRenderer error={error} />
          </div>
        ))
        .map((project) => (
          <ProjectForm
            mode="edit"
            services={props.services}
            defaultValues={project}
            onSubmit={async (_, changes) => {
              await props.services.mutationService.editProject(
                project.id,
                changes,
              );
            }}
            onCancel={() => {}}
          />
        ))}
      <Label size="lg">Danger zone</Label>
      <OpenState>
        {(bag) => (
          <Dialog {...bag}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-min">
                <Trash2 />
                Delete project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Confirm deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this project?
              </DialogDescription>
              <DialogFooter>
                <Button variant="ghost" onClick={bag.close}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await deletePromise.track(props.projectId);
                    bag.close();
                    props.services.navigationService.navigate(
                      props.services.routingService
                        .forWorkspace(props.workspaceId)
                        .forClient(props.clientId)
                        .allProjects(),
                    );
                  }}
                >
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </OpenState>
    </div>
  );
}
