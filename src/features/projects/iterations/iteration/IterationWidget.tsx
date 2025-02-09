import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import { renderError } from "@/features/_common/renderError.tsx";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { rd } from "@passionware/monads";

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
    <div>
      {rd
        .journey(projectIteration)
        .wait("Loading...")
        .catch(renderError)
        .map((x) => x.description)}
    </div>
  );
}
