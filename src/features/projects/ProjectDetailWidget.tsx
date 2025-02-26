import { Project } from "@/api/project/project.api.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { ProjectBreadcrumbView } from "@/features/_common/elements/breadcrumbs/ProjectBreadcrumb.tsx";
import { ProjectListBreadcrumb } from "@/features/_common/elements/breadcrumbs/ProjectListBreadcrumb.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { ProjectDetailContent } from "@/features/projects/ProjectDetailContent.tsx";
import { ProjectDetails } from "@/features/projects/widgets/ProjectDetails.tsx";
import { ProjectTabs } from "@/features/projects/widgets/ProjectTabs.tsx";
import { makeRelativePath } from "@/platform/lang/makeRelativePath.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { Navigate, Route, Routes } from "react-router-dom";

export interface ProjectDetailWidgetProps extends WithFrontServices {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  projectId: Project["id"];
}

export function ProjectDetailWidget(props: ProjectDetailWidgetProps) {
  const basePath = props.services.routingService
    .forWorkspace()
    .forClient()
    .forProject()
    .root();

  return (
    <CommonPageContainer
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <ProjectListBreadcrumb {...props} />,
        <ProjectBreadcrumbView {...props} />,
      ]}
    >
      <ProjectDetails {...props} />
      <ProjectTabs {...props} />
      <Routes>
        <Route
          path={makeRelativePath(
            basePath,
            props.services.routingService
              .forWorkspace()
              .forClient()
              .forProject()
              .root(),
          )}
          element={
            <Navigate
              replace
              to={props.services.routingService
                .forWorkspace(props.workspaceId)
                .forClient(props.clientId)
                .forProject(props.projectId.toString())
                .iterations("active")}
            />
          }
        />
        <Route
          path={makeRelativePath(
            basePath,
            props.services.routingService
              .forWorkspace()
              .forClient()
              .forProject()
              .iterations(),
          )}
          element={
            <ProjectDetailContent
              workspaceId={props.workspaceId}
              clientId={props.clientId}
              projectId={props.projectId}
              services={props.services}
            />
          }
        />
      </Routes>
    </CommonPageContainer>
  );
}
