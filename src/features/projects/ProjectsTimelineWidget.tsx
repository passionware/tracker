import type { ProjectIteration } from "@/api/project-iteration/project-iteration.api.ts";
import { projectIterationQueryUtils } from "@/api/project-iteration/project-iteration.api.ts";
import type { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api.ts";
import { generatedReportSourceQueryUtils } from "@/api/generated-report-source/generated-report-source.api.ts";
import { clientQueryUtils } from "@/api/clients/clients.api.ts";
import type { ClientQuery } from "@/api/clients/clients.api.ts";
import {
  type ProjectQuery,
  projectQueryUtils,
} from "@/api/project/project.api.ts";
import type { Project } from "@/api/project/project.api.ts";
import type { Report } from "@/api/reports/reports.api.ts";
import type { ReportQuery } from "@/api/reports/reports.api.ts";
import { reportQueryUtils } from "@/api/reports/reports.api.ts";
import { BreadcrumbPage } from "@/components/ui/breadcrumb.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { CommonPageContainer } from "@/features/_common/CommonPageContainer.tsx";
import { ClientBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/ClientBreadcrumbLink.tsx";
import { ProjectListBreadcrumb } from "@/features/_common/elements/breadcrumbs/ProjectListBreadcrumb.tsx";
import { WorkspaceBreadcrumbLink } from "@/features/_common/elements/breadcrumbs/WorkspaceBreadcrumbLink.tsx";
import { EnumSetFilterWidget } from "@/features/_common/elements/filters/EnumSetFilterWidget.tsx";
import { SimpleSinglePicker } from "@/features/_common/elements/pickers/SimpleSinglePicker.tsx";
import { ProjectQueryBar } from "@/features/_common/elements/query/ProjectQueryBar.tsx";
import { useEntityDrawerContext } from "@/features/_common/drawers/entityDrawerContext.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { ProjectTimelineBillingMarker } from "@/features/projects/widgets/ProjectTimelineBillingMarker.tsx";
import { ProjectTimelineCostMarker } from "@/features/projects/widgets/ProjectTimelineCostMarker.tsx";
import { ProjectTimelineFloatingBulkBar } from "@/features/projects/widgets/ProjectTimelineFloatingBulkBar.tsx";
import { ProjectTimelineReportBar } from "@/features/projects/widgets/ProjectTimelineReportBar.tsx";
import {
  buildProjectTimelineLanesAndItems,
  indexProjectTimelineLanesById,
  nextIterationOrdinalForProject,
  projectTimelineIterationBarLabel,
  projectTimelineSelectionKeyFromItem,
  suggestedIterationPeriodFromDrawnBar,
  type ProjectTimelineGroupBy,
  type ProjectTimelineItemData,
  type ProjectTimelineLaneMeta,
} from "@/features/projects/widgets/projectTimelineModel.ts";
import { computeSharedBudgetChartYDomain } from "@/features/_common/budget-target/BudgetTargetHistoryChart.utils.ts";
import { ProjectTimelineIterationBudgetBar } from "@/features/projects/widgets/ProjectTimelineIterationBudgetBar.tsx";
import type { CalendarDate } from "@internationalized/date";
import type { CurrencyValue } from "@/services/ExchangeService/ExchangeService.ts";
import type { FormatService } from "@/services/FormatService/FormatService.ts";
import { cn } from "@/lib/utils.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import type { Lane } from "@/platform/passionware-timeline/timeline-lane-tree.ts";
import {
  minutesToZonedDateTime,
  type TimelineItem,
} from "@/platform/passionware-timeline/passionware-timeline-core.ts";
import {
  DefaultTimelineItem,
  InfiniteTimelineWithState,
} from "@/platform/passionware-timeline/passionware-timeline.tsx";
import { PointerFollowTooltip } from "@/components/ui/pointer-follow-tooltip.tsx";
import { ClientSpec, WorkspaceSpec } from "@/routing/routingUtils.ts";
import {
  selectionState,
  useSelectionCleanup,
  type SelectionState,
} from "@/platform/lang/SelectionState.ts";
import { maybe, rd, type Maybe, type RemoteData } from "@passionware/monads";
import { BriefcaseBusiness, CirclePlay, GitBranch, Moon, Sun } from "lucide-react";
import { type ReactNode, useCallback, useMemo, useState } from "react";

/** Calendar period as stored in domain data — not timeline geometry (exclusive zoned end). */
function projectTimelineTooltipSemanticCalendarRange(
  fmt: FormatService,
  periodStart: CalendarDate,
  periodEnd: CalendarDate,
): ReactNode {
  return fmt.temporal.range.long(periodStart, periodEnd);
}

/** Union of calendar periods for iteration, budget, and report bars — matches timeline auto-fit to events. */
function projectTimelineViewportFromEventItems(
  items: TimelineItem<ProjectTimelineItemData>[],
): { start: CalendarDate; end: CalendarDate } | undefined {
  let minStart: CalendarDate | undefined;
  let maxEnd: CalendarDate | undefined;
  for (const item of items) {
    const d = item.data;
    if (
      d.kind !== "iteration" &&
      d.kind !== "iteration-budget" &&
      d.kind !== "report"
    ) {
      continue;
    }
    const { periodStart, periodEnd } = d;
    if (minStart == null || periodStart.compare(minStart) < 0) {
      minStart = periodStart;
    }
    if (maxEnd == null || periodEnd.compare(maxEnd) > 0) {
      maxEnd = periodEnd;
    }
  }
  if (minStart == null || maxEnd == null) return undefined;
  return { start: minStart, end: maxEnd };
}

function pickLatestGeneratedReportByIterationId(
  reports: readonly GeneratedReportSource[],
): Map<number, GeneratedReportSource> {
  const sorted = [...reports].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const byIteration = new Map<number, GeneratedReportSource>();
  for (const r of sorted) {
    if (!byIteration.has(r.projectIterationId)) {
      byIteration.set(r.projectIterationId, r);
    }
  }
  return byIteration;
}

function formatCurrencyValuesPlain(
  values: CurrencyValue[],
  fmt: FormatService,
): string {
  if (values.length === 0) return "";
  return values
    .map((v) => fmt.financial.amountText(v.amount, v.currency))
    .join(" · ");
}

/** Aligns with `formatUnit` in report columns (short labels for timeline tooltips). */
function formatReportTimelineUnit(unit: string | null): string {
  const u = unit ?? "h";
  switch (u) {
    case "h":
    case "d":
    case "pc":
      return u;
    default:
      return u;
  }
}

function reportPaymentStatusLabel(status: "unpaid" | "partially-paid" | "paid"): string {
  switch (status) {
    case "unpaid":
      return "Unpaid";
    case "partially-paid":
      return "Partially paid";
    case "paid":
      return "Paid";
  }
}

const PROJECT_LIFECYCLE_STATUSES = ["draft", "active", "closed"] as const;

function formatLifecycleStatus(
  s: (typeof PROJECT_LIFECYCLE_STATUSES)[number],
): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const projectTimelineGroupByItems = [
  {
    id: "client" as const,
    label: "Client",
    icon: <BriefcaseBusiness className="h-4 w-4" />,
  },
  {
    id: "project" as const,
    label: "Project",
    icon: <GitBranch className="h-4 w-4" />,
  },
];

export interface ProjectsTimelineWidgetProps extends WithFrontServices {
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
}

export function ProjectsTimelineWidget(props: ProjectsTimelineWidgetProps) {
  const queryParamsService =
    props.services.queryParamsService.forEntity("projects");
  const queryParams = queryParamsService.useQueryParams();

  const projectQuery = useMemo(
    () =>
      projectQueryUtils.transform(queryParams).build((q) => [
        q.withEnsureDefault({
          workspaceId: props.workspaceId,
          clientId: props.clientId,
        }),
        (q2) => projectQueryUtils.setPageSize(q2, 5000),
      ]),
    [queryParams, props.workspaceId, props.clientId],
  );

  const setProjectQuery = useCallback(
    (next: ProjectQuery) => queryParamsService.setQueryParams(next),
    [queryParamsService],
  );

  const applyProjectQueryPatch = useCallback(
    (patch: (q: ProjectQuery) => ProjectQuery) => {
      queryParamsService.updateQueryParams((raw) => {
        const q = projectQueryUtils.transform(raw).build((x) => [
          x.withEnsureDefault({
            workspaceId: props.workspaceId,
            clientId: props.clientId,
          }),
          (x2) => projectQueryUtils.setPageSize(x2, 5000),
        ]);
        return patch(q);
      });
    },
    [queryParamsService, props.workspaceId, props.clientId],
  );

  const projectsRd = props.services.projectService.useProjects(projectQuery);

  /** When unset, project list can include every client; exclude hidden clients for iteration listing. */
  const projectClientFilterUnset = projectQuery.filters.clientId == null;

  const visibleClientsQuery = useMemo((): ClientQuery => {
    const base = clientQueryUtils.ofDefault();
    return { ...base, page: { page: 0, pageSize: 5000 } };
  }, []);

  const visibleClientsRd =
    props.services.clientService.useClients(visibleClientsQuery);

  const projectsRdForIterations = useMemo(() => {
    if (!projectClientFilterUnset) return projectsRd;
    return rd.map(
      rd.combine({ projects: projectsRd, clients: visibleClientsRd }),
      ({ projects, clients }) => {
        const visibleIds = new Set(clients.map((c) => c.id));
        return projects.filter((p) => visibleIds.has(p.clientId));
      },
    );
  }, [projectClientFilterUnset, projectsRd, visibleClientsRd]);

  const [groupBy, setGroupBy] = useState<ProjectTimelineGroupBy>("client");
  const timelinePrefs = props.services.preferenceService.useTimelineView();

  const timelineTools = (
    <>
      <ProjectQueryBar
        query={projectQuery}
        onQueryChange={setProjectQuery}
        services={props.services}
        spec={{
          workspace: idSpecUtils.takeOrElse(
            props.workspaceId,
            "disable",
            "show",
          ),
          client: idSpecUtils.takeOrElse(props.clientId, "disable", "show"),
          contractor: "hide",
        }}
      />
      <EnumSetFilterWidget
        fieldLabel="Project status"
        options={PROJECT_LIFECYCLE_STATUSES}
        optionLabel={formatLifecycleStatus}
        value={projectQuery.filters.status}
        onUpdate={(next) =>
          applyProjectQueryPatch((q) =>
            projectQueryUtils.setFilter(q, "status", next),
          )
        }
      />
      <EnumSetFilterWidget
        fieldLabel="Iteration status"
        options={PROJECT_LIFECYCLE_STATUSES}
        optionLabel={formatLifecycleStatus}
        value={projectQuery.filters.iterationStatus}
        onUpdate={(next) =>
          applyProjectQueryPatch((q) =>
            projectQueryUtils.setFilter(q, "iterationStatus", next),
          )
        }
      />
      <Separator orientation="vertical" className="h-6" />
      <SimpleSinglePicker
        items={projectTimelineGroupByItems}
        value={groupBy}
        onSelect={(value) => {
          if (value === "client" || value === "project") {
            setGroupBy(value);
          }
        }}
        placeholder="Group by"
        searchPlaceholder="Search group by"
        size="sm"
        variant="outline"
        searchable={false}
      />
      <div className="flex items-center gap-2">
        <Sun
          className={cn(
            "h-4 w-4",
            timelinePrefs.darkMode
              ? "text-muted-foreground"
              : "text-foreground",
          )}
        />
        <Switch
          checked={timelinePrefs.darkMode}
          onCheckedChange={(next) =>
            void props.services.preferenceService.setTimelineView({
              darkMode: next,
            })
          }
          aria-label="Toggle timeline dark mode"
        />
        <Moon
          className={cn(
            "h-4 w-4",
            timelinePrefs.darkMode
              ? "text-foreground"
              : "text-muted-foreground",
          )}
        />
      </div>
    </>
  );

  return (
    <ProjectsTimelineLayout {...props} tools={timelineTools}>
      {rd
        .journey(projectsRdForIterations)
        .wait(<Skeleton className="min-h-0 flex-1 w-full rounded-md" />)
        .catch(renderError)
        .map((projects) => {
          if (projects.length === 0) {
            return (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 text-center text-sm text-muted-foreground">
                No projects match the current filters. Adjust filters or create
                a project to see iterations on the timeline.
              </div>
            );
          }

          const projectNameById = new Map(
            projects.map((p) => [p.id, p.name] as const),
          );

          return (
            <ProjectsTimelineLoaded
              clientId={props.clientId}
              groupBy={groupBy}
              projectNameById={projectNameById}
              projectQuery={projectQuery}
              projects={projects}
              services={props.services}
              timelineDarkMode={timelinePrefs.darkMode}
              workspaceId={props.workspaceId}
            />
          );
        })}
    </ProjectsTimelineLayout>
  );
}

function ProjectsTimelineLayout(
  props: ProjectsTimelineWidgetProps & {
    children: ReactNode;
    tools?: ReactNode;
  },
) {
  return (
    <CommonPageContainer
      segments={[
        <WorkspaceBreadcrumbLink {...props} />,
        <ClientBreadcrumbLink {...props} />,
        <ProjectListBreadcrumb {...props} />,
        <BreadcrumbPage>Timeline</BreadcrumbPage>,
      ]}
      tools={props.tools}
    >
      <div className="flex min-h-0 flex-1 flex-col">{props.children}</div>
    </CommonPageContainer>
  );
}

function ProjectsTimelineLoaded(props: {
  services: ProjectsTimelineWidgetProps["services"];
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  projects: Project[];
  projectQuery: ProjectQuery;
  projectNameById: ReadonlyMap<number, string>;
  groupBy: ProjectTimelineGroupBy;
  timelineDarkMode: boolean;
}) {
  const iterationStatusFilter = props.projectQuery.filters.iterationStatus;

  const iterationsQuery = useMemo(
    () =>
      projectIterationQueryUtils.getBuilder().build((q) => [
        q.withFilter("projectId", {
          operator: "oneOf",
          value: props.projects.map((p) => p.id),
        }),
        iterationStatusFilter
          ? (q2) =>
              projectIterationQueryUtils.setFilter(
                q2,
                "status",
                iterationStatusFilter,
              )
          : (q2) => q2,
        (q2) => projectIterationQueryUtils.setPageSize(q2, 5000),
      ]),
    [props.projects, iterationStatusFilter],
  );

  const iterationsRd =
    props.services.projectIterationService.useProjectIterations(
      iterationsQuery,
    );

  const iterationsList = rd.tryGet(iterationsRd);

  const reportsQuery = useMemo(() => {
    if (!iterationsList || iterationsList.length === 0) {
      return null;
    }
    const workspaceIds = [
      ...new Set(props.projects.flatMap((p) => p.workspaceIds)),
    ];
    return reportQueryUtils
      .getBuilder(idSpecUtils.ofAll(), props.clientId)
      .build((q) => [
        q.withFilter("projectIterationId", {
          operator: "oneOf",
          value: iterationsList.map((i) => i.id),
        }),
        workspaceIds.length > 0
          ? (q2) =>
              reportQueryUtils.setFilter(q2, "workspaceId", {
                operator: "oneOf",
                value: workspaceIds,
              })
          : (q2) => q2,
        (q2) => reportQueryUtils.setPageSize(q2, 500),
      ]);
  }, [iterationsList, props.projects, props.clientId]);

  const reportsRd = props.services.reportService.useReports(reportsQuery);

  const generatedReportsQuery = useMemo(() => {
    if (!iterationsList || iterationsList.length === 0) {
      return null;
    }
    return generatedReportSourceQueryUtils.getBuilder().build((q) => [
      q.withFilter("projectIterationId", {
        operator: "oneOf",
        value: iterationsList.map((i) => i.id),
      }),
      (q2) => generatedReportSourceQueryUtils.setPageSize(q2, 5000),
    ]);
  }, [iterationsList]);

  const generatedReportsRd =
    props.services.generatedReportSourceService.useGeneratedReportSources(
      maybe.of(generatedReportsQuery),
    );

  return rd
    .journey(iterationsRd)
    .wait(<Skeleton className="min-h-0 flex-1 w-full rounded-md" />)
    .catch(renderError)
    .map((iterations) => {
      if (iterations.length === 0) {
        return (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 text-center text-sm text-muted-foreground">
            No iterations match the current filters. Adjust iteration status or
            project filters to see more.
          </div>
        );
      }

      return (
        <ProjectsTimelineWithReports
          clientId={props.clientId}
          generatedReportsRd={generatedReportsRd}
          groupBy={props.groupBy}
          iterations={iterations}
          projectNameById={props.projectNameById}
          projects={props.projects}
          reportQuery={maybe.of(reportsQuery)}
          reportsRd={reportsRd}
          services={props.services}
          timelineDarkMode={props.timelineDarkMode}
          workspaceId={props.workspaceId}
        />
      );
    });
}

/** Hooks + timeline + floating bulk actions (must not live inside `rd.map`). */
function ProjectsTimelineChartWithSelection(props: {
  services: ProjectsTimelineWidgetProps["services"];
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  iterations: ProjectIteration[];
  projectNameById: ReadonlyMap<number, string>;
  groupBy: ProjectTimelineGroupBy;
  timelineDarkMode: boolean;
  reportQuery: Maybe<ReportQuery>;
  lanes: Lane<ProjectTimelineLaneMeta>[];
  items: TimelineItem<ProjectTimelineItemData>[];
  defaultExpandedLaneIds: Iterable<string> | ReadonlySet<string> | null;
  viewportRange:
    | { start: CalendarDate; end: CalendarDate }
    | null
    | undefined;
  yDomainByBudgetLaneId: Map<string, [number, number]>;
  pushEntityDrawer: ReturnType<
    typeof useEntityDrawerContext
  >["pushEntityDrawer"];
  openEntityDrawer: ReturnType<
    typeof useEntityDrawerContext
  >["openEntityDrawer"];
}) {
  const [timelineSelection, setTimelineSelection] = useState<
    SelectionState<string>
  >(selectionState.selectNone());

  const allTimelineKeys = useMemo(
    () => props.items.map(projectTimelineSelectionKeyFromItem),
    [props.items],
  );

  useSelectionCleanup(timelineSelection, allTimelineKeys, setTimelineSelection);

  const laneById = useMemo(
    () => indexProjectTimelineLanesById(props.lanes),
    [props.lanes],
  );

  const handleTimelineDrawComplete = useCallback(
    (drawn: TimelineItem<unknown>) => {
      const lane = laneById.get(drawn.laneId);
      const m = lane?.meta;
      if (!m || (m.clientId == null && m.projectId == null)) return;
      const { periodStart, periodEnd } = suggestedIterationPeriodFromDrawnBar(
        drawn.start,
        drawn.end,
      );
      const draftKey = `tl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      if (m.projectId != null) {
        props.pushEntityDrawer({
          type: "project-iteration",
          intent: "create",
          projectId: m.projectId,
          draftKey,
          periodStart,
          periodEnd,
          afterCreate: "drawer-detail",
        });
      } else if (m.clientId != null) {
        props.pushEntityDrawer({
          type: "project-iteration",
          intent: "create",
          presetClientId: m.clientId,
          draftKey,
          periodStart,
          periodEnd,
          afterCreate: "drawer-detail",
        });
      }
    },
    [laneById, props.pushEntityDrawer],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border bg-card",
          props.timelineDarkMode && "dark",
        )}
      >
        <div className="min-h-0 flex-1">
          <div className="h-full min-h-0">
            <InfiniteTimelineWithState<
              ProjectTimelineItemData,
              ProjectTimelineLaneMeta
            >
              key={props.groupBy}
              lanes={props.lanes}
              items={props.items}
              defaultExpandedLaneIds={props.defaultExpandedLaneIds}
              defaultSnapOption="1day"
              itemActivateTrigger="click"
              viewportRange={props.viewportRange}
              isEventSelected={(item) =>
                selectionState.isSelected(
                  timelineSelection,
                  projectTimelineSelectionKeyFromItem(item),
                )
              }
              onEventSelect={(item) => {
                setTimelineSelection((s) =>
                  selectionState.toggle(
                    s,
                    projectTimelineSelectionKeyFromItem(item),
                  ),
                );
              }}
              onRangeSelect={(hitItems, mod) => {
                const keys = [
                  ...new Set(hitItems.map(projectTimelineSelectionKeyFromItem)),
                ];
                setTimelineSelection((s) => {
                  if (mod.subtract) {
                    return selectionState.removeFrom(s, keys);
                  }
                  if (mod.extend) {
                    return selectionState.addTo(s, keys);
                  }
                  return selectionState.selectSome(keys);
                });
              }}
              onEscapeSelection={() =>
                setTimelineSelection(selectionState.selectNone())
              }
              onDrawComplete={handleTimelineDrawComplete}
              rangeShadingPreferenceKey="timeline-range-shading:projects"
              defaultShowRangeShading={false}
              renderDrawingPreviewLabel={(p, lane) => {
                const projectId = lane.meta?.projectId;
                if (projectId != null) {
                  const nextOrd = nextIterationOrdinalForProject(
                    props.iterations,
                    projectId,
                  );
                  return (
                    <span className="flex w-full min-w-0 items-center gap-1">
                      <CirclePlay
                        className="h-3 w-3 shrink-0 opacity-95"
                        aria-hidden
                      />
                      <span className="min-w-0 truncate">
                        {projectTimelineIterationBarLabel(
                          props.projectNameById,
                          projectId,
                          nextOrd,
                        )}
                      </span>
                    </span>
                  );
                }
                const start = Math.min(
                  p.previewStartMinutes,
                  p.previewEndMinutes,
                );
                const end = Math.max(
                  p.previewStartMinutes,
                  p.previewEndMinutes,
                );
                const zStart = minutesToZonedDateTime(start, p.baseDate);
                const zEnd = minutesToZonedDateTime(end, p.baseDate);
                const { periodStart, periodEnd } =
                  suggestedIterationPeriodFromDrawnBar(zStart, zEnd);
                return props.services.formatService.temporal.range.plainText(
                  periodStart,
                  periodEnd,
                );
              }}
              renderItem={(itemProps) => {
                const renderPaneItem = (
                  itemPropsArg: typeof itemProps,
                  yDomainByBudgetLaneIdArg: Map<string, [number, number]>,
                ) => {
                  const { item } = itemPropsArg;
                  const d = item.data;

                  if (d.kind === "iteration-budget") {
                    return (
                      <ProjectTimelineIterationBudgetBar
                        {...itemPropsArg}
                        services={props.services}
                        sharedYDomain={yDomainByBudgetLaneIdArg.get(
                          item.laneId,
                        )}
                      />
                    );
                  }

                  const inner =
                    d.kind === "billing" ? (
                      <ProjectTimelineBillingMarker {...itemPropsArg} />
                    ) : d.kind === "cost" ? (
                      <ProjectTimelineCostMarker {...itemPropsArg} />
                    ) : d.kind === "iteration" ? (
                      <DefaultTimelineItem
                        {...itemPropsArg}
                        leadingVisual={
                          <CirclePlay
                            className="h-3 w-3 opacity-95"
                            aria-hidden
                          />
                        }
                      />
                    ) : d.kind === "report" ? (
                      <ProjectTimelineReportBar {...itemPropsArg} />
                    ) : (
                      <DefaultTimelineItem {...itemPropsArg} />
                    );

                  const fmt = props.services.formatService;

                  let tooltipContent: ReactNode;
                  if (d.kind === "billing") {
                    tooltipContent = (
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-snug text-foreground">
                          {d.invoiceNumber}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[10px] text-muted-foreground">
                          <span>Billing ·</span>
                          {projectTimelineTooltipSemanticCalendarRange(
                            fmt,
                            d.invoiceDate,
                            d.invoiceDate,
                          )}
                        </div>
                        <p className="text-[10px]">
                          <span className="text-muted-foreground">
                            Amount ·{" "}
                          </span>
                          <span className="font-medium tabular-nums text-foreground">
                            {fmt.financial.amount(d.totalGross, d.currency)}
                          </span>
                        </p>
                        {d.totalGross !== d.totalNet && (
                          <p className="text-[10px]">
                            <span className="text-muted-foreground">
                              Net ·{" "}
                            </span>
                            <span className="tabular-nums text-foreground">
                              {fmt.financial.amount(d.totalNet, d.currency)}
                            </span>
                          </p>
                        )}
                        <p className="text-[10px]">
                          <span className="text-muted-foreground">Due · </span>
                          <span className="font-medium text-foreground">
                            {fmt.temporal.date(d.invoiceDate)}
                          </span>
                        </p>
                        {d.unpaid && (
                          <p className="text-[10px] font-medium text-amber-700 dark:text-amber-500">
                            Unpaid
                          </p>
                        )}
                      </div>
                    );
                  } else if (d.kind === "report") {
                    const unitSuffix = formatReportTimelineUnit(d.unit);
                    tooltipContent = (
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-snug text-foreground">
                          {item.label}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[10px] text-muted-foreground">
                          <span>Report ·</span>
                          {projectTimelineTooltipSemanticCalendarRange(
                            fmt,
                            d.periodStart,
                            d.periodEnd,
                          )}
                        </div>
                        <p className="text-[10px]">
                          <span className="text-muted-foreground">
                            Net ·{" "}
                          </span>
                          <span className="font-medium tabular-nums text-foreground">
                            {fmt.financial.amount(d.netValue, d.currency)}
                          </span>
                        </p>
                        {d.quantity != null && (
                          <p className="text-[10px]">
                            <span className="text-muted-foreground">
                              Quantity ·{" "}
                            </span>
                            <span className="tabular-nums text-foreground">
                              {d.quantity.toFixed(2)} {unitSuffix}
                            </span>
                          </p>
                        )}
                        {d.unitPrice != null && (
                          <p className="text-[10px]">
                            <span className="text-muted-foreground">
                              Unit price ·{" "}
                            </span>
                            <span className="tabular-nums text-foreground">
                              {fmt.financial.amount(d.unitPrice, d.currency)}/
                              {unitSuffix}
                            </span>
                          </p>
                        )}
                        <p className="text-[10px]">
                          <span className="text-muted-foreground">Cost payment · </span>
                          <span
                            className={cn(
                              "font-medium",
                              d.paymentStatus === "unpaid"
                                ? "text-rose-700 dark:text-rose-400"
                                : d.paymentStatus === "partially-paid"
                                  ? "text-amber-700 dark:text-amber-400"
                                  : "text-emerald-700 dark:text-emerald-400",
                            )}
                          >
                            {reportPaymentStatusLabel(d.paymentStatus)}
                          </span>
                        </p>
                        <div className="mt-1.5 space-y-2 border-t border-border pt-1.5">
                          <div className="flex gap-3">
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Billing
                              </p>
                              <p className="text-[10px]">
                                <span className="text-muted-foreground">
                                  Billed ·{" "}
                                </span>
                                <span className="tabular-nums text-foreground">
                                  {fmt.financial.amount(
                                    d.reportBillingValue,
                                    d.currency,
                                  )}
                                </span>
                              </p>
                              <p className="text-[10px]">
                                <span className="text-muted-foreground">
                                  To link ·{" "}
                                </span>
                                <span className="tabular-nums text-foreground">
                                  {fmt.financial.amount(
                                    d.reportBillingBalance,
                                    d.currency,
                                  )}
                                </span>
                              </p>
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5 border-l border-border pl-3">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Cost
                              </p>
                              <p className="text-[10px]">
                                <span className="text-muted-foreground">
                                  Paid ·{" "}
                                </span>
                                <span className="tabular-nums text-foreground">
                                  {fmt.financial.amount(
                                    d.reportCostValue,
                                    d.currency,
                                  )}
                                </span>
                              </p>
                              <p className="text-[10px]">
                                <span className="text-muted-foreground">
                                  To compensate ·{" "}
                                </span>
                                <span className="tabular-nums text-foreground">
                                  {fmt.financial.amount(
                                    d.reportCostBalance,
                                    d.currency,
                                  )}
                                </span>
                              </p>
                            </div>
                          </div>
                          <p className="text-[10px] border-t border-border pt-2">
                            <span className="text-muted-foreground">
                              Overhead ·{" "}
                            </span>
                            <span className="tabular-nums text-foreground">
                              {fmt.financial.amount(
                                d.billingCostBalance,
                                d.currency,
                              )}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  } else if (d.kind === "cost") {
                    tooltipContent = (
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-snug text-foreground">
                          {d.invoiceNumber ?? item.label}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[10px] text-muted-foreground">
                          <span>Cost ·</span>
                          {projectTimelineTooltipSemanticCalendarRange(
                            fmt,
                            d.invoiceDate,
                            d.invoiceDate,
                          )}
                        </div>
                        <p className="text-[10px]">
                          <span className="text-muted-foreground">
                            Net ·{" "}
                          </span>
                          <span className="font-medium tabular-nums text-foreground">
                            {fmt.financial.amount(d.netValue, d.currency)}
                          </span>
                        </p>
                        {d.grossValue != null && (
                          <p className="text-[10px]">
                            <span className="text-muted-foreground">
                              Gross ·{" "}
                            </span>
                            <span className="tabular-nums text-foreground">
                              {fmt.financial.amount(d.grossValue, d.currency)}
                            </span>
                          </p>
                        )}
                        <p className="text-[10px]">
                          <span className="text-muted-foreground">
                            Invoice date ·{" "}
                          </span>
                          <span className="font-medium text-foreground">
                            {fmt.temporal.date(d.invoiceDate)}
                          </span>
                        </p>
                      </div>
                    );
                  } else if (d.kind === "iteration") {
                    tooltipContent = (
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-snug text-foreground">
                          {d.summaryLabel}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[10px] text-muted-foreground">
                          <span>Iteration ·</span>
                          {projectTimelineTooltipSemanticCalendarRange(
                            fmt,
                            d.periodStart,
                            d.periodEnd,
                          )}
                        </div>
                        {d.latestGeneratedReportBillingLabel != null &&
                          d.latestGeneratedReportBillingLabel.length > 0 && (
                            <p className="text-[10px]">
                              <span className="text-muted-foreground">
                                Latest generated report · billing ·{" "}
                              </span>
                              <span className="font-medium tabular-nums text-foreground">
                                {d.latestGeneratedReportBillingLabel}
                              </span>
                            </p>
                          )}
                      </div>
                    );
                  } else {
                    tooltipContent = (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {item.label}
                      </div>
                    );
                  }

                  const wideTooltip = true;

                  return (
                    <PointerFollowTooltip
                      delayDuration={280}
                      light
                      contentClassName={cn(
                        "shadow-md",
                        wideTooltip
                          ? "max-w-none p-3"
                          : "max-w-xs px-3 py-2",
                      )}
                      content={tooltipContent}
                    >
                      {inner}
                    </PointerFollowTooltip>
                  );
                };
                return renderPaneItem(itemProps, props.yDomainByBudgetLaneId);
              }}
              onItemClick={(item) => {
                const d = item.data;
                if (d.kind === "iteration" || d.kind === "iteration-budget") {
                  props.openEntityDrawer({
                    type: "project-iteration",
                    intent: "detail",
                    projectId: d.projectId,
                    iterationId: d.iterationId,
                  });
                } else if (d.kind === "report") {
                  props.openEntityDrawer({ type: "report", id: d.reportId });
                } else if (d.kind === "billing") {
                  props.openEntityDrawer({ type: "billing", id: d.billingId });
                } else if (d.kind === "cost") {
                  props.openEntityDrawer({ type: "cost", id: d.costId });
                }
              }}
            />
          </div>
        </div>
      </div>
      <ProjectTimelineFloatingBulkBar
        services={props.services}
        workspaceId={props.workspaceId}
        clientId={props.clientId}
        selection={timelineSelection}
        onSelectionChange={setTimelineSelection}
        timelineItems={props.items}
        iterations={props.iterations}
        reportQuery={props.reportQuery}
      />
    </div>
  );
}

function ProjectsTimelineWithReports(props: {
  services: ProjectsTimelineWidgetProps["services"];
  workspaceId: WorkspaceSpec;
  clientId: ClientSpec;
  projects: Project[];
  iterations: ProjectIteration[];
  reportQuery: Maybe<ReportQuery>;
  reportsRd: RemoteData<Report[]>;
  generatedReportsRd: RemoteData<GeneratedReportSource[]>;
  projectNameById: ReadonlyMap<number, string>;
  groupBy: ProjectTimelineGroupBy;
  timelineDarkMode: boolean;
}) {
  const uniqueClientIds = useMemo(
    () => [...new Set(props.projects.map((p) => p.clientId))],
    [props.projects],
  );

  const clientsQuery = useMemo(
    () =>
      clientQueryUtils.transform(clientQueryUtils.ofEmpty()).build((q) => [
        q.withFilter("id", {
          operator: "oneOf",
          value:
            uniqueClientIds.length > 0 ? uniqueClientIds : ([-1] as number[]),
        }),
        (q2) => ({
          ...q2,
          page: { page: 0, pageSize: 200 },
        }),
      ]),
    [uniqueClientIds],
  );

  const clientsRd = props.services.clientService.useClients(clientsQuery);

  const timelineIterationIds = useMemo(
    () => props.iterations.map((i) => i.id),
    [props.iterations],
  );
  const budgetLogsByIterationRd =
    props.services.iterationTriggerService.useBudgetTargetLogsForIterations(
      timelineIterationIds,
    );

  const { openEntityDrawer, pushEntityDrawer } = useEntityDrawerContext();

  const reportsAndGeneratedRd = rd.combine({
    reports: props.reportsRd,
    generated: props.generatedReportsRd,
  });

  return rd
    .journey(reportsAndGeneratedRd)
    .wait(<Skeleton className="min-h-0 flex-1 w-full rounded-md" />)
    .catch(renderError)
    .map(({ reports, generated }) => {
      const clientNameById = new Map(
        rd.tryGet(clientsRd)?.map((c) => [c.id, c.name] as const) ?? [],
      );

      const latestByIteration =
        pickLatestGeneratedReportByIterationId(generated);
      const billingLabelByIterationId = new Map<number, string>();
      for (const [iterationId, report] of latestByIteration) {
        const basic =
          props.services.generatedReportViewService.getBasicInformationView(
            report,
          );
        const label = formatCurrencyValuesPlain(
          basic.statistics.totalBillingBudget,
          props.services.formatService,
        );
        if (label.length > 0) {
          billingLabelByIterationId.set(iterationId, label);
        }
      }

      const { lanes, items, defaultExpandedLaneIds } =
        buildProjectTimelineLanesAndItems(
          props.iterations,
          reports,
          props.projects,
          undefined,
          {
            projectNameById: props.projectNameById,
            groupBy: props.groupBy,
            clientNameById,
            latestGeneratedReportBillingLabelByIterationId:
              billingLabelByIterationId,
          },
        );

      const budgetLogMap = rd.tryGet(budgetLogsByIterationRd);
      const iterationById = new Map(
        props.iterations.map((i) => [i.id, i] as const),
      );
      const yDomainByBudgetLaneId = new Map<string, [number, number]>();
      if (budgetLogMap) {
        const laneIterationIds = new Map<string, number[]>();
        for (const item of items) {
          if (item.data.kind !== "iteration-budget") continue;
          const list = laneIterationIds.get(item.laneId) ?? [];
          list.push(item.data.iterationId);
          laneIterationIds.set(item.laneId, list);
        }
        for (const [laneId, ids] of laneIterationIds) {
          const domain = computeSharedBudgetChartYDomain(
            [...new Set(ids)],
            budgetLogMap,
            iterationById,
          );
          if (domain) yDomainByBudgetLaneId.set(laneId, domain);
        }
      }

      if (items.length === 0) {
        return (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-8 text-sm text-muted-foreground">
            Nothing to show on the timeline.
          </div>
        );
      }

      const viewportRange = projectTimelineViewportFromEventItems(items);

      return (
        <ProjectsTimelineChartWithSelection
          clientId={props.clientId}
          defaultExpandedLaneIds={defaultExpandedLaneIds}
          groupBy={props.groupBy}
          items={items}
          iterations={props.iterations}
          lanes={lanes}
          openEntityDrawer={openEntityDrawer}
          projectNameById={props.projectNameById}
          pushEntityDrawer={pushEntityDrawer}
          reportQuery={props.reportQuery}
          services={props.services}
          timelineDarkMode={props.timelineDarkMode}
          viewportRange={viewportRange ?? undefined}
          workspaceId={props.workspaceId}
          yDomainByBudgetLaneId={yDomainByBudgetLaneId}
        />
      );
    });
}
