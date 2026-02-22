import { TmetricDashboardCacheScope } from "@/api/tmetric-dashboard-cache/tmetric-dashboard-cache.api";
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
import {
  ProjectIteration,
  projectIterationQueryUtils,
} from "@/api/project-iteration/project-iteration.api";
import { projectQueryUtils } from "@/api/project/project.api";
import { calendarDateToJSDate } from "@/platform/lang/internationalized-date";
import { WithFrontServices } from "@/core/frontServices";
import { SimpleArrayPicker } from "@/features/_common/elements/pickers/SimpleArrayPicker";
import type { SimpleItem } from "@/features/_common/elements/pickers/SimpleView";
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView";
import { InfiniteTimeline } from "@/platform/passionware-timeline";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService";
import { idSpecUtils } from "@/platform/lang/IdSpec";
import { maybe, mt, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  CalendarRange,
  Grid3X3,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { contractorQueryUtils } from "@/api/contractor/contractor.api";
import type { ContractorsWithIntegrationStatus } from "@/services/front/TmetricDashboardService/TmetricDashboardService";
import { ContractorWithIterationBreakdown } from "./ContractorWithIterationBreakdown";
import { TmetricCubeExplorer } from "./TmetricCubeExplorer";
import { TmetricHoursPieChart } from "./TmetricHoursPieChart";
import { TmetricScopeHierarchyPanel } from "./TmetricScopeHierarchyPanel";
import { TmetricIterationBarChart } from "./TmetricIterationBarChart";
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
  const activeTab: "overview" | "cube" = location.pathname.includes(
    "/tmetric-dashboard/cube",
  )
    ? "cube"
    : "overview";
  const [timePreset, setTimePreset] = useState<TimePreset>("today");
  const [cachedReport, setCachedReport] = useState<{
    data: import("@/services/io/_common/GenericReport").GenericReport;
  } | null>(null);
  const [integrationStatus, setIntegrationStatus] =
    useState<ContractorsWithIntegrationStatus | null>(null);
  const [selectedIterationIds, setSelectedIterationIds] = useState<number[]>(
    [],
  );

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
  const allIterations = rd.tryMap(iterationsData, (x) => x) ?? [];
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
    const s: TmetricDashboardCacheScope = {};
    if (maybe.isPresent(workspaceId) && !idSpecUtils.isAll(workspaceId)) {
      s.workspaceIds = [workspaceId];
    }
    if (maybe.isPresent(clientId) && !idSpecUtils.isAll(clientId)) {
      s.clientIds = [clientId];
    }
    // Always resolved IDs for cache (never "all_active"); iterationsForScope is selected or all active.
    s.projectIterationIds = iterationsForScope.map((i) => i.id);
    return s;
  }, [workspaceId, clientId, iterationsForScope]);

  const loadIntegrationStatus = useCallback(async () => {
    const status =
      await services.tmetricDashboardService.getContractorsInScopeWithIntegrationStatus(
        scope,
      );
    setIntegrationStatus(status);
  }, [services.tmetricDashboardService, scope]);

  const canLoadOrRefresh = start !== null && end !== null;

  const loadCached = useCallback(async () => {
    if (!canLoadOrRefresh) return;
    const report = await services.tmetricDashboardService.getCached({
      scope,
      periodStart: start,
      periodEnd: end,
    });
    setCachedReport(report ? { data: report } : null);
  }, [services.tmetricDashboardService, scope, start, end, canLoadOrRefresh]);

  const refreshMutation = promiseState.useMutation(async () => {
    if (!canLoadOrRefresh) return null;
    const report = await services.tmetricDashboardService.refreshAndCache({
      scope,
      periodStart: start,
      periodEnd: end,
    });
    setCachedReport({ data: report });
    return report;
  });

  const isRefreshing = mt.isInProgress(refreshMutation.state);

  useEffect(() => {
    if (canLoadOrRefresh) {
      loadCached();
    } else if (timePreset === "unscoped") {
      setCachedReport(null);
    }
  }, [loadCached, canLoadOrRefresh, timePreset]);

  useEffect(() => {
    loadIntegrationStatus();
  }, [loadIntegrationStatus]);

  const contractorsSummary = cachedReport
    ? services.generatedReportViewService.getContractorsSummaryView({
        id: 0,
        createdAt: new Date(),
        projectIterationId: 0,
        data: cachedReport.data,
        originalData: null,
      })
    : null;

  const basicInfo = cachedReport
    ? services.generatedReportViewService.getBasicInformationView({
        id: 0,
        createdAt: new Date(),
        projectIterationId: 0,
        data: cachedReport.data,
        originalData: null,
      })
    : null;

  const reportAsSource = cachedReport
    ? {
        id: 0,
        createdAt: new Date(),
        projectIterationId: 0,
        data: cachedReport.data,
        originalData: null,
      }
    : null;

  const contractorIdsInReport = useMemo(() => {
    if (!cachedReport) return [];
    return [
      ...new Set(cachedReport.data.timeEntries.map((e) => e.contractorId)),
    ];
  }, [cachedReport]);

  const contractorsQuery = services.contractorService.useContractors(
    contractorQueryUtils.getBuilder().build((q) =>
      contractorIdsInReport.length
        ? [
            q.withFilter("id", {
              operator: "oneOf",
              value: contractorIdsInReport,
            }),
          ]
        : [],
    ),
  );

  const contractorNameMap = useMemo(() => {
    const map = new Map<number, string>();
    rd.tryMap(contractorsQuery, (contractors) => {
      contractors.forEach((c) => map.set(c.id, c.fullName));
    });
    contractorIdsInReport.forEach((id) => {
      if (!map.has(id)) map.set(id, `Contractor ${id}`);
    });
    return map;
  }, [contractorsQuery, contractorIdsInReport]);

  const iterationsForBreakdown = useMemo((): ProjectIteration[] => {
    if (!cachedReport) return [];
    if (start && end) {
      return iterationsOverlappingRange(iterationsForScope, start, end);
    }
    return [];
  }, [cachedReport, iterationsForScope, start, end]);

  const contractorIterationBreakdown = useMemo(() => {
    if (!cachedReport || !start || !end) return null;
    return getContractorIterationBreakdown(
      { data: cachedReport.data },
      iterationsForBreakdown,
      projectsMap,
      start,
      end,
    );
  }, [cachedReport, iterationsForBreakdown, projectsMap, start, end]);

  const iterationSummary = useMemo(() => {
    if (!cachedReport || !start || !end) return null;
    return getIterationSummary(
      { data: cachedReport.data },
      iterationsForBreakdown,
      projectsMap,
      start,
      end,
    );
  }, [cachedReport, iterationsForBreakdown, projectsMap, start, end]);

  const { timelineLanes, timelineItems } = useMemo(() => {
    if (!cachedReport) return { timelineLanes: [], timelineItems: [] };
    const { lanes, items } = buildTimelineFromReport(
      { data: cachedReport.data },
      contractorNameMap,
    );
    return { timelineLanes: lanes, timelineItems: items };
  }, [cachedReport, contractorNameMap]);

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
              onClick={refreshMutation.track}
              disabled={isRefreshing || !canLoadOrRefresh}
              variant="default"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh from TMetric
            </Button>
            <Button
              variant="outline"
              onClick={loadCached}
              disabled={!canLoadOrRefresh}
            >
              Load cached
            </Button>
          </div>
        </div>

        {cachedReport && (
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              const tab = v as "overview" | "cube";
              const routing = services.routingService
                .forWorkspace(workspaceId)
                .forClient(clientId);
              if (tab === "cube") {
                navigate(routing.tmetricDashboardCube());
              } else {
                navigate(routing.tmetricDashboard());
              }
            }}
          >
            <TabsList>
              <TabsTrigger value="overview">
                <TrendingUp className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="cube">
                <Grid3X3 className="h-4 w-4 mr-2" />
                Cube Explorer
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Tab content */}
      {activeTab === "cube" && reportAsSource ? (
        <div className="flex-1 min-h-0 mt-4">
          <TmetricCubeExplorer
            report={reportAsSource}
            services={services}
            className="w-full h-full min-h-0"
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-6 mt-4">
          <TmetricScopeHierarchyPanel
            services={services}
            projectsData={projectsData}
            iterationsForScope={iterationsForScope}
            projectsMap={projectsMap}
            cachedReport={cachedReport}
          />

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

          {!cachedReport && !mt.isInError(refreshMutation.state) && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                {timePreset === "unscoped" && !canLoadOrRefresh ? (
                  <>
                    <CalendarRange className="mb-4 h-16 w-16 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No iterations in scope. Add active iterations or select
                      specific ones.
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
                      No cached data. Click &quot;Refresh from TMetric&quot; to
                      fetch data.
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
          )}

          {cachedReport && basicInfo && (
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
              }}
            >
              {/* Stats card: time entries + totals */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Time entries & totals
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="text-2xl font-bold">
                        {basicInfo.statistics.timeEntriesCount}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        time entries
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Total cost
                        </p>
                        <CurrencyValueWidget
                          values={basicInfo.statistics.totalCostBudget}
                          services={services}
                          exchangeService={services.exchangeService}
                          className="text-lg font-semibold"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Total billing
                        </p>
                        <CurrencyValueWidget
                          values={basicInfo.statistics.totalBillingBudget}
                          services={services}
                          exchangeService={services.exchangeService}
                          className="text-lg font-semibold"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Profit</p>
                        <CurrencyValueWidget
                          values={basicInfo.statistics.totalEarningsBudget}
                          services={services}
                          exchangeService={services.exchangeService}
                          className="text-lg font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* By iteration */}
              {iterationSummary && iterationSummary.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>By iteration</CardTitle>
                    <CardDescription>
                      Cost, billing, and profit per iteration
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {iterationSummary.map((iter) => (
                        <div
                          key={iter.iterationId}
                          className="rounded-lg border p-3"
                        >
                          <p className="text-sm font-medium">
                            {iter.iterationLabel}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                Cost:{" "}
                              </span>
                              <CurrencyValueWidget
                                values={iter.cost}
                                services={services}
                                exchangeService={services.exchangeService}
                                className="font-medium"
                              />
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Billing:{" "}
                              </span>
                              <CurrencyValueWidget
                                values={iter.billing}
                                services={services}
                                exchangeService={services.exchangeService}
                                className="font-medium"
                              />
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Profit:{" "}
                              </span>
                              <Badge variant="secondary">
                                <CurrencyValueWidget
                                  values={iter.profit}
                                  services={services}
                                  exchangeService={services.exchangeService}
                                  className="text-inherit"
                                />
                              </Badge>
                            </div>
                            <span className="text-muted-foreground">
                              {iter.hours.toFixed(1)}h · {iter.entries} entries
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : contractorsSummary &&
                contractorsSummary.contractors.length > 0 &&
                !(
                  contractorIterationBreakdown &&
                  contractorIterationBreakdown.length > 0
                ) ? (
                <Card>
                  <CardHeader>
                    <CardTitle>By contractor</CardTitle>
                    <CardDescription>
                      Cost, billing, and profit per contractor (integrated only)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const integratedIds = new Set(
                        integrationStatus?.integratedContractorIds ?? [],
                      );
                      const displayedContractors =
                        integratedIds.size > 0
                          ? contractorsSummary.contractors.filter((c) =>
                              integratedIds.has(c.contractorId),
                            )
                          : contractorsSummary.contractors;
                      const excludedCount =
                        contractorsSummary.contractors.length -
                        displayedContractors.length;

                      return (
                        <>
                          {excludedCount > 0 && (
                            <p className="mb-4 text-sm text-muted-foreground">
                              {excludedCount} contractor(s) in cached data are
                              no longer integrated and excluded from this view.
                              Totals above include their data.
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
                                      exchangeService={services.exchangeService}
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
                                      exchangeService={services.exchangeService}
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
                  contractorIterationBreakdown &&
                  contractorIterationBreakdown.length > 0
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

              {iterationSummary && iterationSummary.length > 0 && (
                <TmetricIterationBarChart
                  iterationSummary={iterationSummary}
                  services={services}
                />
              )}
              {contractorIterationBreakdown &&
                contractorIterationBreakdown.length > 0 && (
                  <TmetricHoursPieChart
                    contractorBreakdown={contractorIterationBreakdown}
                    contractorNameMap={contractorNameMap}
                  />
                )}
              {!(
                contractorIterationBreakdown &&
                contractorIterationBreakdown.length > 0
              ) &&
                contractorsSummary &&
                contractorsSummary.contractors.length > 0 && (
                  <TmetricHoursPieChart
                    contractorBreakdown={contractorsSummary.contractors.map(
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
                    contractorNameMap={contractorNameMap}
                  />
                )}

              {/* By contractor with iteration breakdown (when iteration mode) */}
              {contractorIterationBreakdown &&
                contractorIterationBreakdown.length > 0 && (
                  <Card className="col-span-full">
                    <CardHeader>
                      <CardTitle>By contractor</CardTitle>
                      <CardDescription>
                        Cost, billing, and profit per contractor with breakdown
                        by iteration (integrated only)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const integratedIds = new Set(
                          integrationStatus?.integratedContractorIds ?? [],
                        );
                        const displayed =
                          integratedIds.size > 0
                            ? contractorIterationBreakdown.filter((c) =>
                                integratedIds.has(c.contractorId),
                              )
                            : contractorIterationBreakdown;
                        const excludedCount =
                          contractorIterationBreakdown.length -
                          displayed.length;

                        return (
                          <>
                            {excludedCount > 0 && (
                              <p className="mb-4 text-sm text-muted-foreground">
                                {excludedCount} contractor(s) in cached data are
                                no longer integrated and excluded from this
                                view.
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

              {/* Timeline */}
              {reportAsSource && timelineItems.length > 0 && (
                <Card className="col-span-full">
                  <CardHeader>
                    <CardTitle>Tasks over time</CardTitle>
                    <CardDescription>
                      Timeline view of time entries
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-[400px] rounded-md overflow-hidden border border-border">
                      <InfiniteTimeline
                        items={timelineItems}
                        lanes={timelineLanes}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
