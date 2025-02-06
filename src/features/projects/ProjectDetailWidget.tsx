import { Project } from "@/api/project/project.api.ts";
import { BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/ClientBreadcrumbLink.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/WorkspaceBreadcrumbLink.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithProjectService } from "@/services/io/ProjectService/ProjectService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd } from "@passionware/monads";

export interface ProjectDetailWidgetProps
  extends WithServices<
    [WithProjectService, WithClientService, WithWorkspaceService]
  > {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  projectId: Project["id"];
}

export function ProjectDetailWidget(props: ProjectDetailWidgetProps) {
  const project = props.services.projectService.useProject(props.projectId);
  return (
    <CommonPageContainer
      tools={<></>}
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <BreadcrumbLink>Projects</BreadcrumbLink>,
        <BreadcrumbPage>
          {rd
            .journey(project)
            .wait(<Skeleton className="w-20 h-4" />)
            .catch(renderSmallError("w-20 h-4"))
            .map((x) => x.name)}
        </BreadcrumbPage>,
      ]}
    >
      {/* Content goes here */}
    </CommonPageContainer>
  );
}
