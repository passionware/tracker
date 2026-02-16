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
import { WithFrontServices } from "@/core/frontServices";
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView";
import {
  CubeLayout,
  CubeProvider,
  CubeSummary,
  CubeBreakdownControl,
  CubeTimeSubrangeControl,
  CubeHierarchicalBreakdown,
  CubeDimensionExplorer,
} from "@/features/_common/Cube";
import { SerializedCubeViewWithSelection } from "@/features/_common/Cube/SerializedCubeViewWithSelection";
import { CubeTimelineView } from "@/features/_common/Cube/CubeTimelineView";
import { useReportCube } from "@/features/project-iterations/widgets/useReportCube";
import type { GeneratedReportSource } from "@/api/generated-report-source/generated-report-source.api";
import {
  InfiniteTimeline,
  type Lane,
  type TimelineItem,
} from "@/platform/passionware-timeline";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService";
import { idSpecUtils } from "@/platform/lang/IdSpec";
import { maybe, rd } from "@passionware/monads";
import {
  endOfDay,
  endOfWeek,
  format,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns";
import { fromAbsolute, getLocalTimeZone } from "@internationalized/date";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Grid3X3, RefreshCw, TrendingUp, UserX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { contractorQueryUtils } from "@/api/contractor/contractor.api";
import type { ContractorsWithIntegrationStatus } from "@/services/front/TmetricDashboardService/TmetricDashboardService";

type DateRangePreset = "today" | "week" | "custom" | "all";

function TmetricCubeExplorer({
  report,
  services,
  className,
}: {
  report: GeneratedReportSource;
  services: WithFrontServices["services"];
  className?: string;
}) {
  const { cubeState, serializableConfig } = useReportCube({ report, services });

  return (
    <CubeProvider value={{ state: cubeState, reportId: "tmetric-dashboard" }}>
      <CubeLayout
        className={
          className ??
          "w-full h-full min-h-0 rounded-md border border-border overflow-hidden"
        }
        leftSidebar={
          <>
            <div className="p-4 space-y-4 flex-1">
              <CubeSummary />
              <CubeTimeSubrangeControl services={services} />
              <CubeBreakdownControl />
            </div>
            <div className="p-4 pt-0">
              <CubeHierarchicalBreakdown />
            </div>
          </>
        }
        rightSidebar={<CubeDimensionExplorer />}
        bottomSlot={<CubeTimelineView />}
      >
        <div className="bg-background w-full h-full flex-1 min-h-0 p-4 flex flex-col">
          <SerializedCubeViewWithSelection
            state={cubeState}
            serializedConfig={serializableConfig}
            maxInitialDepth={0}
            enableZoomIn={true}
          />
        </div>
      </CubeLayout>
    </CubeProvider>
  );
}

function getDateRange(preset: DateRangePreset): { start: Date; end: Date } {
  const now = new Date();
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "week":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case "all":
      return { start: subDays(now, 365), end: now };
    default:
      return { start: subDays(now, 7), end: now };
  }
}

export function TmetricDashboardPage(
  props: WithFrontServices & {
    workspaceId: WorkspaceSpec;
    clientId: ClientSpec;
  },
) {
  const { services, workspaceId, clientId } = props;
  const [datePreset, setDatePreset] = useState<DateRangePreset>("week");
  const [cachedReport, setCachedReport] = useState<{
    data: import("@/services/io/_common/GenericReport").GenericReport;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [integrationStatus, setIntegrationStatus] =
    useState<ContractorsWithIntegrationStatus | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "cube">("overview");

  const { start, end } = useMemo(() => getDateRange(datePreset), [datePreset]);

  const scope: TmetricDashboardCacheScope = useMemo(() => {
    const s: TmetricDashboardCacheScope = {};
    if (maybe.isPresent(workspaceId) && !idSpecUtils.isAll(workspaceId)) {
      s.workspaceIds = [workspaceId];
    }
    if (maybe.isPresent(clientId) && !idSpecUtils.isAll(clientId)) {
      s.clientIds = [clientId];
    }
    return s;
  }, [workspaceId, clientId]);

  const loadIntegrationStatus = useCallback(async () => {
    const status =
      await services.tmetricDashboardService.getContractorsInScopeWithIntegrationStatus(
        scope,
      );
    setIntegrationStatus(status);
  }, [services.tmetricDashboardService, scope]);

  const loadCached = useCallback(async () => {
    setError(null);
    const report = await services.tmetricDashboardService.getCached({
      scope,
      periodStart: start,
      periodEnd: end,
    });
    setCachedReport(report ? { data: report } : null);
  }, [services.tmetricDashboardService, scope, start, end]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const report = await services.tmetricDashboardService.refreshAndCache({
        scope,
        periodStart: start,
        periodEnd: end,
      });
      setCachedReport({ data: report });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsRefreshing(false);
    }
  }, [services.tmetricDashboardService, scope, start, end]);

  useEffect(() => {
    loadCached();
  }, [loadCached]);

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
    contractorQueryUtils
      .getBuilder()
      .build((q) =>
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

  const LANE_COLORS = [
    "bg-chart-1",
    "bg-chart-2",
    "bg-chart-3",
    "bg-chart-4",
    "bg-chart-5",
  ];

  const { timelineLanes, timelineItems } = useMemo(() => {
    if (!cachedReport)
      return {
        timelineLanes: [] as Lane[],
        timelineItems: [] as TimelineItem<unknown>[],
      };
    const report = cachedReport.data;
    const timeZone = getLocalTimeZone();

    const byContractor = new Map<number, typeof report.timeEntries>();
    report.timeEntries.forEach((entry) => {
      if (!byContractor.has(entry.contractorId)) {
        byContractor.set(entry.contractorId, []);
      }
      byContractor.get(entry.contractorId)!.push(entry);
    });

    const lanes: Lane[] = Array.from(byContractor.entries())
      .sort(([a], [b]) => a - b)
      .map(([contractorId], i) => ({
        id: String(contractorId),
        name:
          contractorNameMap.get(contractorId) ?? `Contractor ${contractorId}`,
        color: LANE_COLORS[i % LANE_COLORS.length],
      }));

    const items: TimelineItem<unknown>[] = [];
    report.timeEntries.forEach((entry, idx) => {
      const taskType = report.definitions.taskTypes[entry.taskId];
      const activityType = report.definitions.activityTypes[entry.activityId];
      const taskName = taskType?.name ?? "Unknown Task";
      const activityName = activityType?.name ?? "Unknown Activity";
      const durationH =
        (entry.endAt.getTime() - entry.startAt.getTime()) / (1000 * 60 * 60);
      const durationLabel =
        durationH < 1
          ? `${Math.round(durationH * 60)}m`
          : `${durationH.toFixed(1)}h`;
      const label = `${taskName} · ${activityName} (${durationLabel})`;

      items.push({
        id: entry.id || `entry-${idx}`,
        laneId: String(entry.contractorId),
        start: fromAbsolute(entry.startAt.getTime(), timeZone),
        end: fromAbsolute(entry.endAt.getTime(), timeZone),
        label,
        color:
          LANE_COLORS[
            lanes.findIndex((l) => l.id === String(entry.contractorId)) %
              LANE_COLORS.length
          ],
        data: entry,
      });
    });

    return { timelineLanes: lanes, timelineItems: items };
  }, [cachedReport, contractorNameMap]);

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header + tabs row */}
      <div className="flex-shrink-0 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              TMetric Dashboard
            </h1>
            <p className="text-muted-foreground">
              Cross-workspace time tracking insights. Click Refresh to fetch
              from TMetric.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={datePreset}
              onValueChange={(v) => setDatePreset(v as DateRangePreset)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="custom">Last 7 days</SelectItem>
                <SelectItem value="all">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="default"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh from TMetric
            </Button>
            <Button variant="outline" onClick={loadCached}>
              Load cached
            </Button>
          </div>
        </div>

        {cachedReport && (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "overview" | "cube")}
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
          {integrationStatus &&
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
            )}

          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6 text-destructive">
                {error}
              </CardContent>
            </Card>
          )}

          {!cachedReport && !error && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <BarChart3 className="mb-4 h-16 w-16 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No cached data. Click &quot;Refresh from TMetric&quot; to
                  fetch data.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {format(start, "dd MMM yyyy")} – {format(end, "dd MMM yyyy")}
                </p>
              </CardContent>
            </Card>
          )}

          {cachedReport && basicInfo && (
            <>
              {/* Stats summary */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Time entries
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {basicInfo.statistics.timeEntriesCount}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total cost
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CurrencyValueWidget
                      values={basicInfo.statistics.totalCostBudget}
                      services={services}
                      exchangeService={services.exchangeService}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total billing
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CurrencyValueWidget
                      values={basicInfo.statistics.totalBillingBudget}
                      services={services}
                      exchangeService={services.exchangeService}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Profit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CurrencyValueWidget
                      values={basicInfo.statistics.totalEarningsBudget}
                      services={services}
                      exchangeService={services.exchangeService}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Contractor breakdown - only show currently integrated contractors to avoid confusion with stale cache */}
              {contractorsSummary &&
                contractorsSummary.contractors.length > 0 && (
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
                                no longer integrated and excluded from this
                                view. Totals above include their data.
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
                )}

              {/* Timeline */}
              {reportAsSource && timelineItems.length > 0 && (
                <Card>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
