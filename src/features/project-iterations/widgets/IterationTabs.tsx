import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { renderError } from "@/features/_common/renderError.tsx";
import { NewPositionPopover } from "@/features/project-iterations/NewPositionPopover.tsx";
import { makeRelativePath } from "@/platform/lang/makeRelativePath.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { maybe, rd } from "@passionware/monads";
import { Route, Routes } from "react-router-dom";

export function IterationTabs(
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
  const currentTab = maybe.getOrThrow(
    props.services.locationService.useCurrentProjectIterationTab(),
  );
  const iteration =
    props.services.projectIterationService.useProjectIterationDetail(
      props.projectIterationId,
    );
  return (
    <Tabs value={currentTab} className="w-full bg-white sticky top-0 z-[100]">
      <TabsList>
        <TabsTrigger
          value="positions"
          onClick={() =>
            props.services.navigationService.navigate(forIteration.root())
          }
        >
          Positions
          <Badge variant="secondary" size="sm">
            {rd.tryMap(iteration, (iteration) => iteration.positions.length)}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="reports"
          onClick={() =>
            props.services.navigationService.navigate(forIteration.reports())
          }
        >
          Reports
          <Badge variant="warning" size="sm">
            12
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="billings"
          onClick={() =>
            props.services.navigationService.navigate(forIteration.billings())
          }
        >
          Billings
          <Badge variant="accent1" size="sm">
            1
          </Badge>
        </TabsTrigger>
        <Routes>
          <Route
            path={makeRelativePath(forIteration.root(), forIteration.root())}
            element={rd
              .journey(iteration)
              .wait(<Skeleton className="w-20 h-4" />)
              .catch(renderError)
              .map((projectIteration) => (
                <NewPositionPopover
                  className="ml-auto"
                  iterationId={projectIteration.id}
                  services={props.services}
                  workspaceId={props.workspaceId}
                  clientId={props.clientId}
                  projectId={props.projectId}
                  currency={projectIteration.currency}
                />
              ))}
          />
        </Routes>
      </TabsList>
    </Tabs>
  );
}
