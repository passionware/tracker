import { Project } from "@/api/project/project.api.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { ProjectBreadcrumbView } from "@/features/_common/elements/breadcrumbs/ProjectBreadcrumb.tsx";
import { ProjectListBreadcrumb } from "@/features/_common/elements/breadcrumbs/ProjectListBreadcrumb.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { ProjectConfigurationWidget } from "@/features/projects/configuration/ProjectConfigurationWidget.tsx";
import { IterationWidget } from "@/features/projects/iterations/iteration/IterationWidget.tsx";
import { NewPositionPopover } from "@/features/projects/iterations/iteration/NewPositionPopover.tsx";
import { IterationFilterDropdown } from "@/features/projects/iterations/IterationFilter.tsx";
import { NewIterationPopover } from "@/features/projects/iterations/NewIterationPopover.tsx";
import { ProjectIterationListWidget } from "@/features/projects/iterations/ProjectIterationListWidget.tsx";
import { makeRelativePath } from "@/platform/lang/makeRelativePath.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { maybe, rd } from "@passionware/monads";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";

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

  const iterationId =
    props.services.locationService.useCurrentProjectIterationId();

  const iteration =
    props.services.projectIterationService.useProjectIterationDetail(
      iterationId,
    );

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
                .iterations("active"),
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
              key={path}
              to={path}
              className="transition-colors text-sky-800 aria-[current]:bg-sky-700/10 hocus:bg-sky-700/15 p-1 rounded-sm"
            >
              {label}
            </NavLink>
          ))}
        </div>
      }
      tools={
        <Routes>
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
              <>
                <IterationFilterDropdown services={props.services} />
                <NewIterationPopover
                  services={props.services}
                  workspaceId={props.workspaceId}
                  clientId={props.clientId}
                  projectId={props.projectId}
                />
              </>
            }
          />
          <Route
            path={makeRelativePath(
              basePath,
              props.services.routingService
                .forWorkspace()
                .forClient()
                .forProject()
                .forIteration()
                .root(),
            )}
            element={rd.tryMap(iteration, (iteration) => (
              <>
                <NewPositionPopover
                  iterationId={iteration.id}
                  services={props.services}
                  workspaceId={props.workspaceId}
                  clientId={props.clientId}
                  projectId={props.projectId}
                  currency={iteration.currency}
                />
              </>
            ))}
          />
        </Routes>
      }
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <ProjectListBreadcrumb {...props} />,
        <ProjectBreadcrumbView {...props} project={project} />,
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
              .forIteration()
              .root(),
          )}
          element={maybe.map(iterationId, (iterationId) => (
            <IterationWidget
              workspaceId={props.workspaceId}
              clientId={props.clientId}
              projectId={props.projectId}
              services={props.services}
              projectIterationId={iterationId}
            />
          ))}
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
            <ProjectIterationListWidget
              workspaceId={props.workspaceId}
              clientId={props.clientId}
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
