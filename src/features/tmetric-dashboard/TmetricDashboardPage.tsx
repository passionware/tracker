import { contractorQueryUtils } from "@/api/contractor/contractor.api";
import { projectIterationQueryUtils } from "@/api/project-iteration/project-iteration.api";
import { projectQueryUtils } from "@/api/project/project.api";
import {
  dashboardQueryUtils,
  TmetricDashboardCacheScope,
} from "@/api/tmetric-dashboard-cache/tmetric-dashboard-cache.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WithFrontServices } from "@/core/frontServices";
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView";
import { SimpleArrayPicker } from "@/features/_common/elements/pickers/SimpleArrayPicker";
import type { SimpleItem } from "@/features/_common/elements/pickers/SimpleView";
import { idSpecUtils } from "@/platform/lang/IdSpec";
import { calendarDateToJSDate } from "@/platform/lang/internationalized-date";
import { InfiniteTimeline } from "@/platform/passionware-timeline";
import { ErrorMessageRenderer } from "@/platform/react/ErrorMessageRenderer";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService";
import type { ContractorsWithIntegrationStatus } from "@/services/front/TmetricDashboardService/TmetricDashboardService";
import { maybe, mt, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { format } from "date-fns";
import {
  BarChart3,
  CalendarRange,
  Grid3X3,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ContractorWithIterationBreakdown } from "./ContractorWithIterationBreakdown";
import { TmetricContractorDashboard } from "./TmetricContractorDashboard";
import { TmetricCubeExplorer } from "./TmetricCubeExplorer";
import { TmetricHoursPieChart } from "./TmetricHoursPieChart";
import { TmetricIterationBarChart } from "./TmetricIterationBarChart";
import { TmetricScopeHierarchyPanel } from "./TmetricScopeHierarchyPanel";
import {
  buildTimelineFromReport,
  getContractorIterationBreakdown,
  getDateRangeForPreset,
  getDateRangeFromIterations,
  getIterationSummary,
  iterationsOverlappingRange,
  type TimePreset,
} from "./tmetric-dashboard.utils";

export function TmetricDashboardPage(
  props: WithFrontServices & {
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  const { services, workspaceId, clientId } = props;
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab: "overview" | "cube" | "timeline" | "contractor" =
    location.pathname.includes("/tmetric-dashboard/contractor")
      ? "contractor"
      : location.pathname.includes("/tmetric-dashboard/timeline")
        ? "timeline"
        : location.pathname.includes("/tmetric-dashboard/cube")
          ? "cube"
          : "overview";

  const queryParamsService = services.queryParamsService.forEntity("dashboard");
  const rawQueryParams = queryParamsService.useQueryParams();
  const dashboardQuery = useMemo(
    () => dashboardQueryUtils.ensureDefault(rawQueryParams),
    [rawQueryParams],
  );
  const timePreset = dashboardQuery.timePreset;
  const selectedIterationIds = dashboardQuery.iterationIds;
  const setTimePreset = useCallback(
    (value: TimePreset) => {
      queryParamsService.setQueryParams({
        ...dashboardQuery,
        timePreset: value,
      });
    },
    [queryParamsService, dashboardQuery],
  );
  const setSelectedIterationIds = useCallback(
    (ids: number[]) => {
      queryParamsService.setQueryParams({
        ...dashboardQuery,
        iterationIds: ids,
      });
    },
    [queryParamsService, dashboardQuery],
  );

  const [integrationStatus, setIntegrationStatus] =
    useState<ContractorsWithIntegrationStatus | null>(null);

  const projectsQuery = projectQueryUtils.withEnsureDefault({
    workspaceId,
    clientId,
  })(projectQueryUtils.ofDefault());
  const projectsWithActiveFilter = useMemo(
    () =>
      projectQueryUtils
        .transform(projectsQuery)
        .build((q) => [
          q.withFilter("status", { operator: "oneOf", value: ["active"] }),
        ]),
    [projectsQuery],
  );

  const projectsData = services.projectService.useProjects(
    maybe.of(projectsWithActiveFilter),
  );
  const projectIds = useMemo(
    () => rd.tryMap(projectsData, (p) => p.map((x) => x.id)) ?? [],
    [projectsData],
  );

  const iterationsQuery = useMemo(
    () =>
      projectIds.length > 0
        ? projectIterationQueryUtils.getBuilder().build((q) => [
            q.withFilter("projectId", {
              operator: "oneOf",
              value: projectIds,
            }),
            q.withFilter("status", {
              operator: "oneOf",
              value: ["active", "closed"],
            }),
          ])
        : null,
    [projectIds],
  );
  const iterationsData = services.projectIterationService.useProjectIterations(
    maybe.of(iterationsQuery),
  );
  const allIterations = useMemo(
    () => rd.tryMap(iterationsData, (x) => x) ?? [],
    [iterationsData],
  );
  const iterationsActiveFirst = useMemo(
    () =>
      [...allIterations].sort((a, b) => {
        const statusOrder = { active: 0, closed: 1, draft: 2 };
        return (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
      }),
    [allIterations],
  );

  const projectsMap = useMemo(() => {
    const map = new Map<number, { name: string }>();
    rd.tryMap(projectsData, (projects) => {
      projects.forEach((p) => map.set(p.id, { name: p.name }));
    });
    return map;
  }, [projectsData]);

  const selectedIterations = useMemo(
    () => allIterations.filter((i) => selectedIterationIds.includes(i.id)),
    [allIterations, selectedIterationIds],
  );

  const iterationsForScope = useMemo(() => {
    if (selectedIterationIds.length > 0) return selectedIterations;
    return allIterations.filter((i) => i.status === "active");
  }, [selectedIterationIds, selectedIterations, allIterations]);

  // Stable key for scope so callbacks/effects don’t re-run when array refs change
  const scopeIterationIdsKey = useMemo(
    () =>
      (selectedIterationIds.length > 0
        ? [...selectedIterationIds].sort((a, b) => a - b)
        : allIterations
            .filter((i) => i.status === "active")
            .map((i) => i.id)
            .sort((a, b) => a - b)
      ).join(","),
    [selectedIterationIds, allIterations],
  );

  const iterationRange = useMemo(
    () => getDateRangeFromIterations(iterationsForScope),
    [iterationsForScope],
  );

  const iterationPickerItems: SimpleItem[] = useMemo(
    () =>
      iterationsActiveFirst.map((iter) => {
        const project = projectsMap.get(iter.projectId);
        const projectName = project?.name ?? `Project ${iter.projectId}`;
        const periodLabel = `${format(calendarDateToJSDate(iter.periodStart), "dd MMM yyyy")} – ${format(calendarDateToJSDate(iter.periodEnd), "dd MMM yyyy")}`;
        const statusLabel =
          iter.status === "active"
            ? " · Active"
            : iter.status === "closed"
              ? " · Closed"
              : "";
        return {
          id: String(iter.id),
          label: `${projectName} #${iter.ordinalNumber}${statusLabel} (${periodLabel})`,
          compactLabel: `${projectName} #${iter.ordinalNumber}`,
        };
      }),
    [iterationsActiveFirst, projectsMap],
  );

  const { start, end } = useMemo(() => {
    const range = getDateRangeForPreset(timePreset, iterationRange);
    if (!range) return { start: null as Date | null, end: null as Date | null };
    return { start: range.start, end: range.end };
  }, [timePreset, iterationRange]);

  const scope: TmetricDashboardCacheScope = useMemo(() => {
    const s: TmetricDashboardCacheScope = { projectIterationIds: [] };
    if (maybe.isPresent(workspaceId) && !idSpecUtils.isAll(workspaceId)) {
      s.workspaceIds = [workspaceId];
    }
    if (maybe.isPresent(clientId) && !idSpecUtils.isAll(clientId)) {
      s.clientIds = [clientId];
    }
    s.projectIterationIds = scopeIterationIdsKey
      ? scopeIterationIdsKey.split(",").map(Number)
      : [];
    return s;
  }, [workspaceId, clientId, scopeIterationIdsKey]);

  const loadIntegrationStatus = useCallback(async () => {
    const status =
      await services.tmetricDashboardService.getContractorsInScopeWithIntegrationStatus(
        scope,
      );
    setIntegrationStatus(status);
  }, [services.tmetricDashboardService, scope]);

  const canLoadOrRefresh = start !== null && end !== null;

  const cachedReportQuery = services.tmetricDashboardService.useCached({
    scope,
    periodStart: start,
    periodEnd: end,
  });

  const refreshMutation = promiseState.useMutation(async () => {
    if (!canLoadOrRefresh) return null;
    return services.tmetricDashboardService.refreshAndCache({
      scope,
      periodStart: start,
      periodEnd: end,
    });
  });

  const handleRefresh = useCallback(() => {
    if (!canLoadOrRefresh) return;
    refreshMutation.track(undefined).catch(() => {});
  }, [refreshMutation, canLoadOrRefresh]);

  const isRefreshing = mt.isInProgress(refreshMutation.state);

  useEffect(() => {
    loadIntegrationStatus();
  }, [loadIntegrationStatus]);

  const contractorsSummary = rd.useMemoMap(cachedReportQuery, (cachedReport) =>
    services.generatedReportViewService.getContractorsSummaryView({
      id: 0,
      createdAt: new Date(),
      projectIterationId: 0,
      data: cachedReport.data,
      originalData: null,
    }),
  );

  const basicInfo = rd.useMemoMap(cachedReportQuery, (cachedReport) =>
    services.generatedReportViewService.getBasicInformationView({
      id: 0,
      createdAt: new Date(),
      projectIterationId: 0,
      data: cachedReport.data,
      originalData: null,
    }),
  );

  const reportAsSource = rd.useMemoMap(cachedReportQuery, (cachedReport) => ({
    id: 0,
    createdAt: new Date(),
    projectIterationId: 0,
    data: cachedReport.data,
    originalData: null,
  }));

  const contractorIdsInReport = rd.useMemoMap(
    cachedReportQuery,
    (cachedReport) => {
      return [
        ...new Set(cachedReport.data.timeEntries.map((e) => e.contractorId)),
      ];
    },
  );

  const contractorsQuery = services.contractorService.useContractors(
    rd.tryMap(contractorIdsInReport, (ids) =>
      contractorQueryUtils.getBuilder().build((q) =>
        ids.length
          ? [
              q.withFilter("id", {
                operator: "oneOf",
                value: ids,
              }),
            ]
          : [],
      ),
    ),
  );

  const contractorNameMap = rd.useMemoMap(contractorsQuery, (contractors) => {
    return new Map(contractors.map((c) => [c.id, c.fullName]));
  });

  const iterationsForBreakdown = rd.useMemoMap(
    cachedReportQuery,
    (cachedReport) => {
      if (!cachedReport || !start || !end) return [];
      return iterationsOverlappingRange(iterationsForScope, start, end);
    },
  );

  const contractorIterationBreakdown = rd.useMemoMap(
    rd.combine({ cachedReportQuery, iterationsForBreakdown }),
    ({ cachedReportQuery, iterationsForBreakdown }) => {
      if (!cachedReportQuery || !start || !end) return null;
      return getContractorIterationBreakdown(
        { data: cachedReportQuery.data },
        iterationsForBreakdown,
        projectsMap,
        start,
        end,
      );
    },
  );

  const iterationSummary = rd.useMemoMap(
    rd.combine({ cachedReportQuery, iterationsForBreakdown }),
    ({ cachedReportQuery, iterationsForBreakdown }) => {
      if (!cachedReportQuery || !start || !end) return null;
      return getIterationSummary(
        { data: cachedReportQuery.data },
        iterationsForBreakdown,
        projectsMap,
        start,
        end,
      );
    },
  );

  const timeline = rd.useMemoMap(
    rd.combine({ cachedReportQuery, contractorNameMap }),
    ({ cachedReportQuery, contractorNameMap }) => {
      if (!cachedReportQuery) return { timelineLanes: [], timelineItems: [] };
      const { lanes, items } = buildTimelineFromReport(
        { data: cachedReportQuery.data },
        contractorNameMap,
      );
      return { timelineLanes: lanes, timelineItems: items };
    },
  );

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header + tabs row */}
      <div className="flex-shrink-0 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                TMetric Dashboard
              </h1>
              <Badge variant="secondary">BETA</Badge>
            </div>
            <p className="text-muted-foreground">
              Cross-workspace time tracking insights. Click Refresh to fetch
              from TMetric.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={timePreset}
              onValueChange={(v) => setTimePreset(v as TimePreset)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_week">This week</SelectItem>
                <SelectItem value="last_week">Last week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="unscoped">
                  Unscoped (whole iterations)
                </SelectItem>
              </SelectContent>
            </Select>

            <SimpleArrayPicker
              items={iterationPickerItems}
              value={selectedIterationIds.map(String)}
              onSelect={(ids) =>
                setSelectedIterationIds(ids.map((id) => Number(id)))
              }
              placeholder="All active iterations"
              searchPlaceholder="Search iterations..."
              variant="outline"
              align="start"
              side="bottom"
            />

            <Button
              onClick={handleRefresh}
              disabled={isRefreshing || !canLoadOrRefresh}
              variant="default"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh from TMetric
            </Button>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            const tab = v as "overview" | "cube" | "timeline" | "contractor";
            const routing = services.routingService
              .forWorkspace(workspaceId)
              .forClient(clientId);
            if (tab === "cube") navigate(routing.tmetricDashboardCube());
            else if (tab === "timeline")
              navigate(routing.tmetricDashboardTimeline());
            else if (tab === "contractor")
              navigate(routing.tmetricDashboardContractor());
            else navigate(routing.tmetricDashboard());
          }}
        >
          <TabsList>
            <TabsTrigger value="overview">
              <TrendingUp className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <CalendarRange className="h-4 w-4 mr-2" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="contractor">
              <Users className="h-4 w-4 mr-2" />
              Contractor
            </TabsTrigger>
            <TabsTrigger value="cube">
              <Grid3X3 className="h-4 w-4 mr-2" />
              Cube Explorer
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab content */}
      {activeTab === "timeline" ? (
        rd
          .journey(rd.combine({ cachedReportQuery, contractorNameMap, timeline }))
          .wait(() => (
            <div className="flex-1 min-h-0 mt-4 flex items-center justify-center">
              <Skeleton className="h-[400px] w-full max-w-4xl rounded-md" />
            </div>
          ))
          .catch(() => null)
          .map(({ timeline: resolvedTimeline }) =>
            resolvedTimeline.timelineItems.length > 0 ? (
              <div className="flex-1 min-h-0 flex flex-col mt-4" key="timeline-tab">
                <Card className="flex-1 min-h-0 flex flex-col">
                  <CardHeader>
                    <CardTitle>Tasks over time</CardTitle>
                    <CardDescription>
                      Timeline view of time entries
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-[400px]">
                    <div className="w-full h-full min-h-[400px] rounded-md overflow-hidden border border-border">
                      <InfiniteTimeline
                        items={resolvedTimeline.timelineItems}
                        lanes={resolvedTimeline.timelineLanes}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex-1 min-h-0 mt-4 flex items-center justify-center">
                <Card className="max-w-md">
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No time entries in the selected range. Load report and try
                    another range.
                  </CardContent>
                </Card>
              </div>
            ),
          )
      ) : activeTab === "contractor" ? (
        <div className="flex-1 overflow-auto mt-4">
          <TmetricContractorDashboard
            services={services}
            contractorIterationBreakdown={contractorIterationBreakdown}
            contractorNameMap={contractorNameMap}
            integrationStatus={integrationStatus}
          />
        </div>
      ) : activeTab === "cube" ? (
        rd
          .journey(reportAsSource)
          .wait(() => (
            <div className="flex-1 min-h-0 mt-4 flex items-center justify-center">
              <div className="w-full max-w-md space-y-4 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-8 w-3/4" />
              </div>
            </div>
          ))
          .catch((error) => (
            <div className="flex-1 min-h-0 mt-4 p-4">
              <Card className="border-destructive">
                <CardContent className="pt-6 text-destructive">
                  <ErrorMessageRenderer error={error} />
                </CardContent>
              </Card>
            </div>
          ))
          .map((report) => (
            <div className="flex-1 min-h-0 mt-4" key="cube">
              <TmetricCubeExplorer
                report={report}
                services={services}
                className="w-full h-full min-h-0"
              />
            </div>
          ))
      ) : (
        <div className="flex-1 overflow-auto space-y-6 mt-4">
          {rd
            .journey(cachedReportQuery)
            .wait(() => (
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
            .catch(() => null)
            .map((reportData) => (
              <TmetricScopeHierarchyPanel
                key="scope-panel"
                services={services}
                projectsData={projectsData}
                iterationsForScope={iterationsForScope}
                projectsMap={projectsMap}
                cachedReport={reportData}
              />
            ))}

          {rd
            .journey(cachedReportQuery)
            .wait(() => (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Skeleton className="h-16 w-16 rounded-full mb-4" />
                  <Skeleton className="h-5 w-64" />
                  <Skeleton className="h-4 w-48 mt-2" />
                </CardContent>
              </Card>
            ))
            .catch(() => null)
            .map((data) =>
              !data && !mt.isInError(refreshMutation.state) ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    {timePreset === "unscoped" && !canLoadOrRefresh ? (
                      <>
                        <CalendarRange className="mb-4 h-16 w-16 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          No iterations in scope. Add active iterations or
                          select specific ones.
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Iterations are chosen above; by default all active
                          iterations.
                        </p>
                      </>
                    ) : (
                      <>
                        <BarChart3 className="mb-4 h-16 w-16 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          No cached data. Click &quot;Refresh from TMetric&quot;
                          to fetch data.
                        </p>
                        {start && end && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {format(start, "dd MMM yyyy")} –{" "}
                            {format(end, "dd MMM yyyy")}
                          </p>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              ) : null,
            )}

          {/* {integrationStatus &&
            (integrationStatus.integratedContractorIds.length > 0 ||
              integrationStatus.nonIntegratedContractorIds.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Scope</CardTitle>
                  <CardDescription>
                    {integrationStatus.integratedContractorIds.length +
                      integrationStatus.nonIntegratedContractorIds.length}{" "}
                    contractor(s) in scope ·{" "}
                    {integrationStatus.integratedContractorIds.length}{" "}
                    integrated with TMetric
                    {integrationStatus.nonIntegratedContractorIds.length > 0 &&
                      ` · ${integrationStatus.nonIntegratedContractorIds.length} not integrated`}
                  </CardDescription>
                </CardHeader>
                {integrationStatus.nonIntegratedContractorIds.length > 0 && (
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UserX className="h-4 w-4 shrink-0" />
                      <span>Not integrated (excluded from refresh):</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {integrationStatus.nonIntegratedContractorIds.map(
                        (cid) => (
                          <ContractorWidget
                            key={cid}
                            contractorId={maybe.of(cid)}
                            services={services}
                            layout="full"
                            size="sm"
                            className="opacity-60"
                          />
                        ),
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )} */}

          {mt.isInError(refreshMutation.state) && (
            <Card className="border-destructive">
              <CardContent className="pt-6 text-destructive">
                {refreshMutation.state.error?.message ??
                  refreshMutation.state.error}
              </CardContent>
            </Card>
          )}

          {rd
            .journey(
              rd.combine({
                cachedReportQuery,
                basicInfo,
                contractorsSummary,
                iterationSummary,
                contractorIterationBreakdown,
                contractorNameMap,
              }),
            )
            .wait(() => (
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
                }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-8 w-24" />
                    <div className="grid grid-cols-3 gap-4 pt-4">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-4 w-full mt-1" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              </div>
            ))
            .catch((error) => (
              <Card className="border-destructive">
                <CardContent className="pt-6 text-destructive">
                  <ErrorMessageRenderer error={error} />
                </CardContent>
              </Card>
            ))
            .map(
              ({
                cachedReportQuery: _report,
                contractorsSummary: resolvedContractorsSummary,
                iterationSummary: resolvedIterationSummary,
                contractorIterationBreakdown:
                  resolvedContractorIterationBreakdown,
                contractorNameMap: resolvedContractorNameMap,
              }) =>
                !_report ? null : (
                  <div
                    className="grid gap-4"
                    style={{
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(480px, 1fr))",
                    }}
                  >
                    {resolvedContractorsSummary &&
                      resolvedContractorsSummary.contractors.length > 0 &&
                      !(
                        resolvedContractorIterationBreakdown &&
                        resolvedContractorIterationBreakdown.length > 0
                      ) ? (
                      <Card>
                        <CardHeader>
                          <CardTitle>By contractor</CardTitle>
                          <CardDescription>
                            Cost, billing, and profit per contractor (integrated
                            only)
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            const integratedIds = new Set(
                              integrationStatus?.integratedContractorIds ?? [],
                            );
                            const displayedContractors =
                              integratedIds.size > 0
                                ? resolvedContractorsSummary.contractors.filter(
                                    (c) => integratedIds.has(c.contractorId),
                                  )
                                : resolvedContractorsSummary.contractors;
                            const excludedCount =
                              resolvedContractorsSummary.contractors.length -
                              displayedContractors.length;

                            return (
                              <>
                                {excludedCount > 0 && (
                                  <p className="mb-4 text-sm text-muted-foreground">
                                    {excludedCount} contractor(s) in cached data
                                    are no longer integrated and excluded from
                                    this view. Totals above include their data.
                                  </p>
                                )}
                                <div className="space-y-4">
                                  {displayedContractors.map((c) => (
                                    <div
                                      key={c.contractorId}
                                      className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                      <ContractorWidget
                                        contractorId={maybe.of(c.contractorId)}
                                        services={services}
                                        layout="full"
                                        size="sm"
                                      />
                                      <div className="flex flex-wrap gap-4 text-sm">
                                        <div>
                                          <span className="text-muted-foreground">
                                            Cost:{" "}
                                          </span>
                                          <CurrencyValueWidget
                                            values={c.costBudget}
                                            services={services}
                                            exchangeService={
                                              services.exchangeService
                                            }
                                            className="font-medium"
                                          />
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">
                                            Billing:{" "}
                                          </span>
                                          <CurrencyValueWidget
                                            values={c.billingBudget}
                                            services={services}
                                            exchangeService={
                                              services.exchangeService
                                            }
                                            className="font-medium"
                                          />
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">
                                            Profit:{" "}
                                          </span>
                                          <Badge variant="secondary">
                                            <CurrencyValueWidget
                                              values={c.earningsBudget}
                                              services={services}
                                              exchangeService={
                                                services.exchangeService
                                              }
                                              className="text-inherit"
                                            />
                                          </Badge>
                                        </div>
                                        <span className="text-muted-foreground">
                                          {c.totalHours.toFixed(1)}h ·{" "}
                                          {c.entriesCount} entries
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    ) : !(
                        resolvedContractorIterationBreakdown &&
                        resolvedContractorIterationBreakdown.length > 0
                      ) ? (
                      <Card>
                        <CardHeader>
                          <CardTitle>By contractor</CardTitle>
                          <CardDescription>
                            No contractors in cached data
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    ) : null}

                    {resolvedIterationSummary &&
                      resolvedIterationSummary.length > 0 && (
                        <TmetricIterationBarChart
                          iterationSummary={resolvedIterationSummary}
                          services={services}
                        />
                      )}
                    {resolvedContractorIterationBreakdown &&
                      resolvedContractorIterationBreakdown.length > 0 && (
                        <TmetricHoursPieChart
                          contractorBreakdown={
                            resolvedContractorIterationBreakdown
                          }
                          contractorNameMap={resolvedContractorNameMap}
                        />
                      )}
                    {!(
                      resolvedContractorIterationBreakdown &&
                      resolvedContractorIterationBreakdown.length > 0
                    ) &&
                      resolvedContractorsSummary &&
                      resolvedContractorsSummary.contractors.length > 0 && (
                        <TmetricHoursPieChart
                          contractorBreakdown={resolvedContractorsSummary.contractors.map(
                            (c) => ({
                              contractorId: c.contractorId,
                              total: {
                                cost: c.costBudget,
                                billing: c.billingBudget,
                                profit: c.earningsBudget,
                                hours: c.totalHours,
                                entries: c.entriesCount,
                              },
                              byIteration: [],
                            }),
                          )}
                          contractorNameMap={resolvedContractorNameMap}
                        />
                      )}

                    {/* By contractor with iteration breakdown (when iteration mode) */}
                    {resolvedContractorIterationBreakdown &&
                      resolvedContractorIterationBreakdown.length > 0 && (
                        <Card className="col-span-full">
                          <CardHeader>
                            <CardTitle>By contractor</CardTitle>
                            <CardDescription>
                              Cost, billing, and profit per contractor with
                              breakdown by iteration (integrated only)
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {(() => {
                              const integratedIds = new Set(
                                integrationStatus?.integratedContractorIds ??
                                  [],
                              );
                              const displayed =
                                integratedIds.size > 0
                                  ? resolvedContractorIterationBreakdown.filter(
                                      (c) => integratedIds.has(c.contractorId),
                                    )
                                  : resolvedContractorIterationBreakdown;
                              const excludedCount =
                                resolvedContractorIterationBreakdown.length -
                                displayed.length;

                              return (
                                <>
                                  {excludedCount > 0 && (
                                    <p className="mb-4 text-sm text-muted-foreground">
                                      {excludedCount} contractor(s) in cached
                                      data are no longer integrated and excluded
                                      from this view.
                                    </p>
                                  )}
                                  <div className="space-y-2">
                                    {displayed.map((c) => (
                                      <ContractorWithIterationBreakdown
                                        key={c.contractorId}
                                        contractorId={c.contractorId}
                                        total={c.total}
                                        byIteration={c.byIteration}
                                        services={services}
                                      />
                                    ))}
                                  </div>
                                </>
                              );
                            })()}
                          </CardContent>
                        </Card>
                      )}

                  </div>
                ),
            )}
        </div>
      )}
    </div>
  );
}
