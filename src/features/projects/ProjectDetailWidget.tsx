import { Project } from "@/api/project/project.api.ts";
import { BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/ClientBreadcrumbLink.tsx";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/WorkspaceBreadcrumbLink.tsx";
import { ProjectForm } from "@/features/projects/ProjectForm.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import {
  ClientSpec,
  WithRoutingService,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithNavigationService } from "@/services/internal/NavigationService/NavigationService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithProjectService } from "@/services/io/ProjectService/ProjectService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd } from "@passionware/monads";
import { Route, Routes } from "react-router-dom";

export interface ProjectDetailWidgetProps
  extends WithServices<
    [
      WithProjectService,
      WithClientService,
      WithWorkspaceService,
      WithNavigationService,
      WithRoutingService,
    ]
  > {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  projectId: Project["id"];
}

export function ProjectDetailWidget(props: ProjectDetailWidgetProps) {
  const project = props.services.projectService.useProject(props.projectId);
  const matchedRoot = props.services.navigationService.useMatch(
    props.services.routingService
      .forWorkspace(props.workspaceId)
      .forClient(props.clientId)
      .forProject(props.projectId.toString())
      .root(),
  );

  return (
    <CommonPageContainer
      tools={
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
              Details
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
      }
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
      <Routes>
        <Route
          path={props.services.routingService
            .forWorkspace()
            .forClient()
            .forProject()
            .relative.root()}
          element={<div>Details</div>}
        />
        <Route
          path={props.services.routingService
            .forWorkspace()
            .forClient()
            .forProject()
            .relative.configuration()}
          element={
            <ProjectForm
              services={props.services}
              defaultValues={rd.tryGet(project)}
            />
          }
        />
      </Routes>
    </CommonPageContainer>
  );
}
