import { Project } from "@/api/project/project.api.ts";
import { BreadcrumbLink } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { ClientWidget } from "@/features/_common/elements/pickers/ClientView.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { rd, RemoteData } from "@passionware/monads";

export interface ProjectBreadcrumbProps extends WithFrontServices {
  project: RemoteData<Project>;
  projectId: Project["id"];
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
}

export function ProjectBreadcrumbView(props: ProjectBreadcrumbProps) {
  return (
    <BreadcrumbLink>
      <Button variant="ghost" size="sm" className="px-2 -mx-2">
        {rd
          .journey(props.project)
          .wait(<Skeleton className="w-20 h-4" />)
          .catch(renderSmallError("w-20 h-4"))
          .map((x) => {
            return (
              <>
                {idSpecUtils.isAll(props.clientId) && (
                  <ClientWidget
                    size="xs"
                    clientId={x.clientId}
                    services={props.services}
                  />
                )}
                {x.name}
              </>
            );
          })}
      </Button>
    </BreadcrumbLink>
  );
}
