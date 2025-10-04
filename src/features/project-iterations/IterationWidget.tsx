import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { ProjectBreadcrumbView } from "@/features/_common/elements/breadcrumbs/ProjectBreadcrumb.tsx";
import { ProjectIterationBreadcrumb } from "@/features/_common/elements/breadcrumbs/ProjectIterationBreadcrumb.tsx";
import { ProjectListBreadcrumb } from "@/features/_common/elements/breadcrumbs/ProjectListBreadcrumb.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { Details } from "@/features/project-iterations/widgets/Details.tsx";
import { EventsWidget } from "@/features/project-iterations/widgets/EventsWidget.tsx";
import { GeneratedReportDetail } from "@/features/project-iterations/widgets/GeneratedReportDetail.tsx";
import { GeneratedReportList } from "@/features/project-iterations/widgets/GeneratedReportList.tsx";
import { IterationTabs } from "@/features/project-iterations/widgets/IterationTabs.tsx";
import { LinkedReportList } from "@/features/project-iterations/widgets/LinkedReportList.tsx";
import { PositionList } from "@/features/project-iterations/widgets/PositionList.tsx";
import { makeRelativePath } from "@/platform/lang/makeRelativePath.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { Route, Routes } from "react-router-dom";

export function IterationWidget(
  props: WithFrontServices & {
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
    projectId: number;
    projectIterationId: ProjectIteration["id"];
  },
) {
  const forIteration = props.services.routingService
    .forWorkspace(props.workspaceId)
    .forClient(props.clientId)
    .forProject(props.projectId.toString())
    .forIteration(props.projectIterationId.toString());

  const basePath = forIteration.root();

  return (
    <CommonPageContainer
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <ProjectListBreadcrumb {...props} />,
        <ProjectBreadcrumbView {...props} />,
        <ProjectIterationBreadcrumb {...props} />,
      ]}
    >
      <div className="space-y-4">
        <Details {...props} />
        <IterationTabs {...props} />
        <Routes>
          <Route
            path={makeRelativePath(basePath, forIteration.root())}
            element={<PositionList {...props} />}
          />
          <Route
            path={makeRelativePath(basePath, forIteration.events())}
            element={<EventsWidget {...props} />}
          />
          <Route
            path={makeRelativePath(basePath, forIteration.reports())}
            element={<LinkedReportList {...props} />}
          />
          <Route
            path={makeRelativePath(basePath, forIteration.billings())}
            element={<div>Billings</div>}
          />
          <Route
            path={makeRelativePath(
              forIteration.root(),
              forIteration.generatedReports(),
            )}
            element={
              <GeneratedReportList
                projectIterationId={props.projectIterationId}
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
              forIteration.forGeneratedReport().root(),
            )}
            element={
              <GeneratedReportDetail
                projectIterationId={props.projectIterationId}
                workspaceId={props.workspaceId}
                clientId={props.clientId}
                projectId={props.projectId}
                reportId={parseInt(
                  window.location.pathname.split("/").pop() || "0",
                )}
                services={props.services}
              />
            }
          />
          <Route
            path={makeRelativePath(
              basePath,
              `${forIteration.forGeneratedReport().root()}/basic`,
            )}
            element={
              <GeneratedReportDetail
                projectIterationId={props.projectIterationId}
                workspaceId={props.workspaceId}
                clientId={props.clientId}
                projectId={props.projectId}
                reportId={parseInt(
                  window.location.pathname.split("/").slice(-2, -1)[0] || "0",
                )}
                services={props.services}
              />
            }
          />
          <Route
            path={makeRelativePath(
              basePath,
              `${forIteration.forGeneratedReport().root()}/time-entries`,
            )}
            element={
              <GeneratedReportDetail
                projectIterationId={props.projectIterationId}
                workspaceId={props.workspaceId}
                clientId={props.clientId}
                projectId={props.projectId}
                reportId={parseInt(
                  window.location.pathname.split("/").slice(-2, -1)[0] || "0",
                )}
                services={props.services}
              />
            }
          />
        </Routes>
      </div>
    </CommonPageContainer>
  );
}
