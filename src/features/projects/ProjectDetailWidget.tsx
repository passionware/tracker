import { Project } from "@/api/project/project.api.ts";
import { BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
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
import { ChevronsUpDown } from "lucide-react";
import { NavLink, Route, Routes } from "react-router-dom";

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

  return (
    <CommonPageContainer
      footer={
        <div className="flex flex-row gap-4 justify-end bg-linear-to-r/oklab from-indigo-50 to-teal-50 border-t border-teal-800/20 p-2 ">
          {[
            [
              props.services.routingService
                .forWorkspace(props.workspaceId)
                .forClient(props.clientId)
                .forProject(props.projectId.toString())
                .root(),
              "Iterations",
            ],
            [
              props.services.routingService
                .forWorkspace(props.workspaceId)
                .forClient(props.clientId)
                .forProject(props.projectId.toString())
                .reports(),
              "Reports",
            ],
            [
              props.services.routingService
                .forWorkspace(props.workspaceId)
                .forClient(props.clientId)
                .forProject(props.projectId.toString())
                .configuration(),
              "Configuration",
            ],
          ].map(([path, label]) => (
            <NavLink
              end
              key={path}
              to={path}
              className="transition-colors text-sky-800 aria-[current]:bg-sky-700/10 hocus:bg-sky-700/15 p-1 rounded-sm"
            >
              {label}
            </NavLink>
          ))}
        </div>
      }
      tools={null}
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <BreadcrumbLink>Projects</BreadcrumbLink>,
        <BreadcrumbLink>
          {rd
            .journey(project)
            .wait(<Skeleton className="w-20 h-4" />)
            .catch(renderSmallError("w-20 h-4"))
            .map((x) => x.name)}
        </BreadcrumbLink>,
        <BreadcrumbPage>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="px-2 -mx-2 group">
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
                    element="Iterations"
                  />
                  <Route
                    path={makeRelativePath(
                      basePath,
                      props.services.routingService
                        .forWorkspace()
                        .forClient()
                        .forProject()
                        .reports(),
                    )}
                    element="Reports"
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
                    element="Configuration"
                  />
                </Routes>
                <ChevronsUpDown className="size-4 opacity-0 group-hocus:opacity-100" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  props.services.navigationService.navigate(
                    props.services.routingService
                      .forWorkspace(props.workspaceId)
                      .forClient(props.clientId)
                      .forProject(props.projectId.toString())
                      .root(),
                  )
                }
              >
                Iterations
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  props.services.navigationService.navigate(
                    props.services.routingService
                      .forWorkspace(props.workspaceId)
                      .forClient(props.clientId)
                      .forProject(props.projectId.toString())
                      .reports(),
                  )
                }
              >
                Reports
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  props.services.navigationService.navigate(
                    props.services.routingService
                      .forWorkspace(props.workspaceId)
                      .forClient(props.clientId)
                      .forProject(props.projectId.toString())
                      .configuration(),
                  )
                }
              >
                Configuration
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </BreadcrumbPage>,
      ]}
    >
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
