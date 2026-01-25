import { generatedReportSourceQueryUtils } from "@/api/generated-report-source/generated-report-source.api.ts";
import { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import type { Contractor } from "@/api/contractor/contractor.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { InlineReportSearch } from "@/features/_common/elements/inline-search/InlineReportSearch.tsx";
import { InlinePopoverForm } from "@/features/_common/InlinePopoverForm.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { GeneratedReportIdResolver } from "@/features/app/RootWidget.idResolvers";
import { NewPositionPopover } from "@/features/project-iterations/NewPositionPopover.tsx";
import { GeneratedReportHeader } from "@/features/project-iterations/widgets/GeneratedReportHeader.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { calendarDateToJSDate } from "@/platform/lang/internationalized-date";
import { makeRelativePath } from "@/platform/lang/makeRelativePath.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { maybe, rd } from "@passionware/monads";
import { Slot } from "@radix-ui/react-slot";
import { Link2, FileText } from "lucide-react";
import { Route, Routes } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { ReportGenerationWidget } from "@/features/project-iterations/widgets/report-generation/tmetric/ReportGenerationWidget.tsx";
import { reportQueryUtils } from "@/api/reports/reports.api";
import { ListView } from "@/features/_common/ListView.tsx";
import {
  selectionState,
  SelectionState,
  useSelectionCleanup,
} from "@/platform/lang/SelectionState";
import { createColumnHelper } from "@tanstack/react-table";
import { useState } from "react";

const contractorColumnHelper = createColumnHelper<Contractor>();

function GenerateReportButton(
  props: WithFrontServices & {
    projectIterationId: ProjectIteration["id"];
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  const [selection, setSelection] = useState<SelectionState<number>>(
    selectionState.selectAll(),
  );
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Get project iteration to access period and projectId
  const iteration =
    props.services.projectIterationService.useProjectIterationDetail(
      props.projectIterationId,
    );

  // Get project to access contractors
  const projectId = rd.tryMap(iteration, (iter) => iter.projectId);
  const project = props.services.projectService.useProject(projectId);

  // Get contractors assigned to the project
  const contractorsQuery = props.services.contractorService.useContractors(
    maybe.mapOrNull(projectId, (id) =>
      contractorQueryUtils.getBuilder().build((q) => [
        q.withFilter("projectId", {
          operator: "oneOf",
          value: [id],
        }),
      ]),
    ),
  );

  // Clean up selection when contractors change
  useSelectionCleanup(
    selection,
    rd.tryMap(contractorsQuery, (contractors) => contractors.map((c) => c.id)),
    setSelection,
  );

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="accent1" size="sm" className="ml-auto">
          <FileText />
          Generate Report
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-4" align="start">
        {rd
          .journey(
            rd.combine({
              iteration,
              project,
              contractors:
                contractorsQuery || rd.ofError(new Error("No query")),
            }),
          )
          .wait(
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>,
          )
          .catch(() => (
            <div className="text-sm text-destructive">
              Failed to load project data
            </div>
          ))
          .map(({ iteration: iter, contractors }) => {
            if (contractors.length === 0) {
              return (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      Generate Detailed Report
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      No contractors assigned to this project. Please assign
                      contractors first.
                    </p>
                  </div>
                </div>
              );
            }

            const selectedContractorIds = selectionState.getSelectedIds(
              selection,
              contractors.map((c) => c.id),
            );

            return (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Generate Detailed Report
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select contractors to include in the report generation for
                    the iteration period.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground mb-2">
                    Period:{" "}
                    {props.services.formatService.temporal.range.long(
                      iter.periodStart,
                      iter.periodEnd,
                    )}
                  </div>
                  <div className="max-h-[300px] overflow-auto border rounded-md">
                    <ListView
                      data={rd.of(contractors)}
                      query={contractorQueryUtils.ofEmpty()}
                      onQueryChange={() => {}}
                      selection={selection}
                      onSelectionChange={setSelection}
                      columns={[
                        contractorColumnHelper.accessor("name", {
                          header: "Name",
                        }),
                        contractorColumnHelper.accessor("fullName", {
                          header: "Full Name",
                        }),
                      ]}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-sm text-muted-foreground">
                      {selectedContractorIds.length > 0 ? (
                        <span>
                          {selectedContractorIds.length} contractor(s) selected
                        </span>
                      ) : (
                        <span>No contractors selected</span>
                      )}
                    </div>
                    <Button
                      className="ml-auto"
                      disabled={selectedContractorIds.length === 0}
                      onClick={() => {
                        setPopoverOpen(false);
                        // Filter contractors to get only selected ones
                        const selectedContractors = contractors.filter((c) =>
                          selectedContractorIds.includes(c.id),
                        );
                        props.services.dialogService.show((api) => {
                          return (
                            <ReportGenerationWidget
                              {...api}
                              contractors={selectedContractors}
                              periodStart={iter.periodStart}
                              periodEnd={iter.periodEnd}
                              projectIterationId={props.projectIterationId}
                              clientId={props.clientId}
                              services={props.services}
                            />
                          );
                        });
                      }}
                    >
                      Generate Report
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
      </PopoverContent>
    </Popover>
  );
}

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

  // Query for linked reports (same as in LinkedReportList)
  const linkedReportsQuery = reportQueryUtils
    .getBuilder(props.workspaceId, props.clientId)
    .build((q) => [
      q.withFilter("projectIterationId", {
        operator: "oneOf",
        value: [props.projectIterationId],
      }),
    ]);

  const linkedReports =
    props.services.reportDisplayService.useReportView(linkedReportsQuery);

  // Query for generated reports
  const generatedReportsQuery = generatedReportSourceQueryUtils
    .getBuilder()
    .build((q) => [
      q.withFilter("projectIterationId", {
        operator: "oneOf",
        value: [props.projectIterationId],
      }),
    ]);

  const generatedReports =
    props.services.generatedReportSourceService.useGeneratedReportSources(
      maybe.of(generatedReportsQuery),
    );

  const reportsQuery = rd.map(
    rd.combine({ project, iteration }),
    ({ project, iteration }) =>
      reportQueryUtils
        // we don't scope reports to routing workspace
        .getBuilder(idSpecUtils.ofAll(), project.clientId)
        .build((q) => [
          q.withFilter("projectIterationId", {
            operator: "oneOf",
            value: [null],
          }),
          // instead we scope reports to project workspaces
          idSpecUtils.mapSpecificOrElse(
            project.workspaceIds,
            (x) => q.withFilter("workspaceId", { operator: "oneOf", value: x }),
            q.unchanged(),
          ),
          q.withFilter("period", {
            operator: "between",
            value: {
              from: calendarDateToJSDate(iteration.periodStart),
              to: calendarDateToJSDate(iteration.periodEnd),
            },
          }),
        ]),
  );

  return (
    <Tabs value={currentTab} className="w-full bg-white sticky top-0 z-1">
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
          Linked reports
          <Badge variant="secondary" size="sm">
            {rd.tryMap(linkedReports, (reports) => reports.entries.length)}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="generated-reports"
          onClick={() =>
            props.services.navigationService.navigate(
              forIteration.generatedReports(),
            )
          }
        >
          Generated reports
          <Badge variant="secondary" size="sm">
            {rd.tryMap(generatedReports, (reports) => reports.length)}
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
                            workspaceId: idSpecUtils.ofAll(),
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
                                  // close only if list is empty
                                  const newLinkedReports =
                                    await props.services.reportService.ensureReports(
                                      reportsQuery,
                                    );
                                  if (newLinkedReports.length === 0) {
                                    bag.close();
                                  }
                                }}
                              >
                                {button}
                              </Slot>
                            );
                          }}
                          initialNewReportValues={{
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
          <Route
            path={makeRelativePath(
              forIteration.root(),
              forIteration.generatedReports(),
            )}
            element={rd
              .journey(iteration)
              .wait(<Skeleton className="w-20 h-4" />)
              .catch(renderError)
              .map((projectIteration) => (
                <GenerateReportButton
                  projectIterationId={projectIteration.id}
                  workspaceId={props.workspaceId}
                  clientId={props.clientId}
                  services={props.services}
                />
              ))}
          />
          <Route
            path={makeRelativePath(
              forIteration.root(),
              `${forIteration.forGeneratedReport().root()}/*`,
            )}
            element={
              <GeneratedReportIdResolver services={props.services}>
                {(reportId) => (
                  <GeneratedReportHeader
                    projectIterationId={props.projectIterationId}
                    workspaceId={props.workspaceId}
                    clientId={props.clientId}
                    projectId={props.projectId}
                    reportId={reportId}
                    services={props.services}
                  />
                )}
              </GeneratedReportIdResolver>
            }
          />
        </Routes>
      </TabsList>
    </Tabs>
  );
}
