import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { reportQueryUtils } from "@/api/reports/reports.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { InlineReportSearch } from "@/features/_common/elements/inline-search/InlineReportSearch.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { NewPositionPopover } from "@/features/project-iterations/NewPositionPopover.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { makeRelativePath } from "@/platform/lang/makeRelativePath.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { maybe, rd } from "@passionware/monads";
import { Slot } from "@radix-ui/react-slot";
import { Link2 } from "lucide-react";
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
  const project = props.services.projectService.useProject(props.projectId);
  const iteration =
    props.services.projectIterationService.useProjectIterationDetail(
      props.projectIterationId,
    );

  const reportsQuery = rd.map(
    rd.combine({ project, iteration }),
    ({ project, iteration }) =>
      reportQueryUtils
        .getBuilder(project.workspaceId, project.clientId)
        .build((q) => [
          q.withFilter("projectIterationId", {
            operator: "oneOf",
            value: [null],
          }),
          q.withFilter("period", {
            operator: "between",
            value: { from: iteration.periodStart, to: iteration.periodEnd },
          }),
        ]),
  );

  return (
    <Tabs value={currentTab} className="w-full bg-white sticky top-0 z-[50]">
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
          value="events"
          onClick={() =>
            props.services.navigationService.navigate(forIteration.events())
          }
        >
          Events
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
                  workspaceId={rd.mapOrElse(
                    project,
                    (p) => p.workspaceId,
                    idSpecUtils.ofAll(),
                  )}
                  clientId={rd.mapOrElse(
                    project,
                    (p) => p.clientId,
                    idSpecUtils.ofAll(),
                  )}
                  projectId={props.projectId}
                  currency={projectIteration.currency}
                />
              ))}
          />
          <Route
            path={makeRelativePath(forIteration.root(), forIteration.reports())}
            element={rd
              .journey(iteration)
              .wait(<Skeleton className="w-20 h-4" />)
              .catch(renderError)
              .map((projectIteration) => (
                <InlinePopoverForm
                  trigger={
                    <Button variant="accent1" size="sm" className="ml-auto">
                      <Link2 />
                      Link report
                    </Button>
                  }
                  content={(bag) =>
                    rd.tryMap(
                      rd.combine({ project, reportsQuery }),
                      ({ project, reportsQuery }) => (
                        <InlineReportSearch
                          showBillingColumns
                          showCostColumns={false}
                          context={{
                            workspaceId: maybe.getOrElse(
                              project.workspaceId,
                              idSpecUtils.ofAll(),
                            ),
                            clientId: maybe.getOrElse(
                              project.clientId,
                              idSpecUtils.ofAll(),
                            ),
                            contractorId: idSpecUtils.ofAll(),
                          }}
                          query={reportsQuery}
                          services={props.services}
                          renderSelect={(report, button, track) => {
                            return (
                              <Slot
                                onClick={async () => {
                                  await track(
                                    props.services.mutationService.editReport(
                                      report.id,
                                      {
                                        projectIterationId: projectIteration.id,
                                      },
                                    ),
                                  );
                                  bag.close();
                                }}
                              >
                                {button}
                              </Slot>
                            );
                          }}
                          initialNewReportValues={{
                            workspaceId: project.workspaceId,
                            clientId: project.clientId,
                            currency: projectIteration.currency,
                            periodStart: projectIteration.periodStart,
                            periodEnd: projectIteration.periodEnd,
                          }}
                        />
                      ),
                    )
                  }
                />
              ))}
          />
        </Routes>
      </TabsList>
    </Tabs>
  );
}
