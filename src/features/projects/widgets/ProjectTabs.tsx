import { projectIterationQueryUtils } from "@/api/project-iteration/project-iteration.api.ts";
import { Project } from "@/api/project/project.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { rd } from "@passionware/monads";

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
  // const project = props.services.projectService.useProject(props.projectId);
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

  // const contractorsQuery = rd.map(project, (project) =>
  //   contractorQueryUtils.getBuilder().build((q) => [
  //     q.unchanged(), // todo - add special view so we can filter contractor by project id
  //     // q.withFilter("projectIterationId", {
  //     //   operator: "oneOf",
  //     //   value: [null],
  //     // }),
  //   ]),
  // );

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
            0 {/* TODO read contractors for project*/}
          </Badge>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
