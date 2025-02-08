import { Project } from "@/api/project/project.api.ts";
import { BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { ClientBreadcrumbLink } from "@/features/_common/ClientBreadcrumbLink.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/WorkspaceBreadcrumbLink.tsx";
import { ProjectConfigurationWidget } from "@/features/projects/configuration/ProjectConfigurationWidget.tsx";
import { ProjectIterationListWidget } from "@/features/projects/iterations/ProjectIterationListWidget.tsx";
import { makeRelativePath } from "@/platform/lang/makeRelativePath.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { rd } from "@passionware/monads";
import { Route, Routes } from "react-router-dom";

export interface ProjectDetailWidgetProps extends WithFrontServices {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  projectId: Project["id"];
}

export function ProjectDetailWidget(props: ProjectDetailWidgetProps) {
  const project = props.services.projectService.useProject(props.projectId);
  const basePath = props.services.routingService
    .forWorkspace()
    .forClient()
    .forProject()
    .root();
  const matchedRoot = props.services.navigationService.useMatch(
    props.services.routingService
      .forWorkspace(props.workspaceId)
      .forClient(props.clientId)
      .forProject(props.projectId.toString())
      .root(),
  );

  return (
    <CommonPageContainer
      tools={null}
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
      <Tabs value={matchedRoot ? "details" : "configuration"}>
        <TabsList>
          <TabsTrigger
            value="details"
            onClick={() => {
              props.services.navigationService.navigate(
                props.services.routingService
                  .forWorkspace(props.workspaceId)
                  .forClient(props.clientId)
                  .forProject(props.projectId.toString())
                  .root(),
              );
            }}
          >
            Iterations
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            onClick={() => {
              props.services.navigationService.navigate(
                props.services.routingService
                  .forWorkspace(props.workspaceId)
                  .forClient(props.clientId)
                  .forProject(props.projectId.toString())
                  .root(),
              );
            }}
          >
            Reports
          </TabsTrigger>
          <TabsTrigger
            value="configuration"
            onClick={() => {
              props.services.navigationService.navigate(
                props.services.routingService
                  .forWorkspace(props.workspaceId)
                  .forClient(props.clientId)
                  .forProject(props.projectId.toString())
                  .configuration(),
              );
            }}
          >
            Configuration
          </TabsTrigger>
        </TabsList>
      </Tabs>
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
            <ProjectIterationListWidget
              projectId={props.projectId}
              services={props.services}
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
              .configuration(),
          )}
          element={
            <ProjectConfigurationWidget
              services={props.services}
              projectId={props.projectId}
              workspaceId={props.workspaceId}
              clientId={props.clientId}
            />
          }
        />
      </Routes>
    </CommonPageContainer>
  );
}
