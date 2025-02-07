import { Project } from "@/api/project/project.api.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ProjectForm } from "@/features/projects/_common/ProjectForm.tsx";
import { cn } from "@/lib/utils.ts";
import { ErrorMessageRenderer } from "@/platform/react/ErrorMessageRenderer.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithProjectService } from "@/services/io/ProjectService/ProjectService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd } from "@passionware/monads";

export interface ProjectConfigurationWidgetProps
  extends WithServices<
    [
      WithMutationService,
      WithProjectService,
      WithClientService,
      WithWorkspaceService,
    ]
  > {
  projectId: Project["id"];
}
export function ProjectConfigurationWidget(
  props: ProjectConfigurationWidgetProps,
) {
  const project = props.services.projectService.useProject(props.projectId);

  return rd
    .journey(project)
    .wait(<Skeleton className="h-96" />)
    .catch((error) => (
      <div className={cn("rounded-md border p-4 text-red-600")}>
        <ErrorMessageRenderer error={error} />
      </div>
    ))
    .map((project) => (
      <ProjectForm
        services={props.services}
        defaultValues={project}
        onSubmit={async (_, changes) => {
          await props.services.mutationService.editProject(project.id, changes);
        }}
        onCancel={() => {}}
      />
    ));
}
