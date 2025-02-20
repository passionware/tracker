import { Project } from "@/api/project/project.api.ts";
import { BreadcrumbLink } from "@/components/ui/breadcrumb.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { ClientWidget } from "@/features/_common/elements/pickers/ClientView.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { rd } from "@passionware/monads";
import { Link } from "react-router-dom";

export interface ProjectBreadcrumbProps extends WithFrontServices {
  projectId: Project["id"];
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
}

export function ProjectBreadcrumbView(props: ProjectBreadcrumbProps) {
  const project = props.services.projectService.useProject(props.projectId);
  return (
    <BreadcrumbLink>
      <Link
        className="flex flex-row gap-2"
        to={props.services.routingService
          .forWorkspace(props.workspaceId)
          .forClient(props.clientId)
          .forProject(props.projectId.toString())
          .root()}
      >
        {rd
          .journey(project)
          .wait(<Skeleton className="w-20 h-4" />)
          .catch(renderSmallError("w-20 h-4"))
          .map((x) => {
            return (
              <>
                {idSpecUtils.isAll(props.clientId) && (
                  <ClientWidget
                    size="xs"
                    layout="avatar"
                    clientId={x.clientId}
                    services={props.services}
                  />
                )}
                {x.name}
              </>
            );
          })}
      </Link>
    </BreadcrumbLink>
  );
}
