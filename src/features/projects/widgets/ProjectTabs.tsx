import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import { projectIterationQueryUtils } from "@/api/project-iteration/project-iteration.api.ts";
import { Project } from "@/api/project/project.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { IterationFilterDropdown } from "@/features/project-iterations/IterationFilter.tsx";
import { NewIterationPopover } from "@/features/project-iterations/NewIterationPopover.tsx";
import { AddContractorPopover } from "@/features/projects/widgets/AddContractorPopover.tsx";
import { makeRelativePath } from "@/platform/lang/makeRelativePath.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { rd } from "@passionware/monads";
import { Route, Routes } from "react-router-dom";

export function ProjectTabs(
  props: WithFrontServices & {
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
    projectId: Project["id"];
  },
) {
  const forProject = props.services.routingService
    .forWorkspace(props.workspaceId)
    .forClient(props.clientId)
    .forProject(props.projectId.toString());
  const currentTab = props.services.locationService.useCurrentProjectTab();
  const project = props.services.projectService.useProject(props.projectId);
  const numIterations = rd.map(
    props.services.projectIterationService.useProjectIterations(
      projectIterationQueryUtils.getBuilder().build((q) => [
        q.withFilter("projectId", {
          operator: "oneOf",
          value: [props.projectId],
        }),
      ]),
    ),
    (iterations) => iterations.length,
  );

  const contractorsQuery = rd.map(project, (project) =>
    contractorQueryUtils.getBuilder().build((q) => [
      q.withFilter("projectId", {
        operator: "oneOf",
        value: [project.id],
      }),
    ]),
  );

  const numContractors = rd.map(
    props.services.contractorService.useContractors(
      rd.tryGet(contractorsQuery),
    ),
    (contractors) => contractors.length,
  );

  return (
    <Tabs
      value={currentTab ?? "iterations"}
      className="w-full bg-white sticky top-0 z-[50]"
    >
      <TabsList>
        <TabsTrigger
          value="iterations"
          onClick={() =>
            props.services.navigationService.navigate(
              forProject.iterations("active"),
            )
          }
        >
          Iterations
          <Badge variant="secondary" size="sm">
            {rd.tryGet(numIterations)}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="details"
          onClick={() =>
            props.services.navigationService.navigate(forProject.details())
          }
        >
          Details
        </TabsTrigger>
        <TabsTrigger
          value="contractors"
          onClick={() =>
            props.services.navigationService.navigate(forProject.contractors())
          }
        >
          Contractors
          <Badge variant="warning" size="sm">
            {rd.tryGet(numContractors)}
          </Badge>
        </TabsTrigger>
        <div className="ml-auto flex flex-row gap-2 items-center">
          <Routes>
            <Route
              path={makeRelativePath(
                forProject.root(),
                forProject.iterations(),
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
                forProject.root(),
                forProject.contractors(),
              )}
              element={<AddContractorPopover {...props} />}
            />
          </Routes>
        </div>
      </TabsList>
    </Tabs>
  );
}
