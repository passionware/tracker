import { Project } from "@/api/project/project.api.ts";
import {
  AbstractEntityView,
  AbstractEntityViewProps,
} from "@/features/_common/elements/pickers/_common/AbstractEntityView.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { SwitchProps } from "@/platform/typescript/SwitchProps.ts";
import { WithProjectService } from "@/services/io/ProjectService/ProjectService.ts";
import { Maybe, maybe, rd, RemoteData } from "@passionware/monads";

export type ProjectViewProps = SwitchProps<
  AbstractEntityViewProps,
  "entity",
  { project: RemoteData<Project> }
>;

export function ProjectView({ project, ...props }: ProjectViewProps) {
  const entity = rd.map(project, (p) => ({
    name: p.name,
    avatarUrl: maybe.ofAbsent(),
  }));
  return <AbstractEntityView entity={entity} {...props} />;
}

export type ProjectWidgetProps = WithServices<[WithProjectService]> &
  SwitchProps<
    ProjectViewProps,
    "project",
    {
      projectId: Maybe<Project["id"]>;
    }
  >;

export function ProjectWidget({ projectId, ...props }: ProjectWidgetProps) {
  const project = props.services.projectService.useProject(projectId);
  return <ProjectView project={project} {...props} />;
}
