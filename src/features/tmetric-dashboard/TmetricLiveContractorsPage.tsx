import { clientQueryUtils } from "@/api/clients/clients.api";
import { dashboardQueryUtils } from "@/api/tmetric-dashboard-cache/tmetric-dashboard-cache.api";
import { workspaceQueryUtils } from "@/api/workspace/workspace.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WithFrontServices } from "@/core/frontServices";
import { myQueryClient } from "@/core/query.connected";
import { CustomKpiCards } from "@/features/tmetric-dashboard/custom-kpis/CustomKpiCards";
import { useTmetricDashboardData } from "@/features/tmetric-dashboard/useTmetricDashboardData";
import { MobileSidebarTrigger } from "@/features/_common/MobileSidebarTrigger";
import { TmetricLiveContractorsTimeline } from "@/features/tmetric-dashboard/TmetricLiveContractorsTimeline";
import { cn } from "@/lib/utils";
import { idSpecUtils } from "@/platform/lang/IdSpec";
import { ErrorMessageRenderer } from "@/platform/react/ErrorMessageRenderer";
import { myRouting } from "@/routing/myRouting";
import { rd } from "@passionware/monads";
import { format, formatDistanceToNow, isValid } from "date-fns";
import {
  Columns2,
  Database,
  ExternalLink,
  Gauge,
  MoreVertical,
  RefreshCw,
  Rows3,
  Timer,
} from "lucide-react";
import qs from "qs";
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";

const LIVE_PANEL_QUERY_PREFIX = "tmetric_live_contractors_panel" as const;

function toJsDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value);
  }
  return new Date(NaN);
}

function formatHours(h: number): string {
  if (h < 0.05) return "0 h";
  if (h < 10) return `${h.toFixed(1)} h`;
  return `${Math.round(h)} h`;
}

function liveSkeletonRowCount(lastStored: number | null): number {
  if (lastStored == null) return 3;
  if (lastStored === 0) return 1;
  return Math.min(lastStored, 60);
}

function ContractorRowSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm min-h-[5.5rem]"
      aria-hidden
    >
      <div className="flex items-start gap-2.5 p-2.5">
        <div className="flex min-w-0 min-h-0 flex-1 flex-col gap-1 rounded-lg py-0.5 pl-0.5 pr-1">
          <div className="flex gap-2">
            <Skeleton className="mt-0.5 size-7 shrink-0 rounded-md" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex w-full min-w-0 items-center gap-1.5">
                <Skeleton className="h-5 min-w-0 flex-1 max-w-[58%] rounded-md" />
                <Skeleton className="h-5 w-[3.25rem] shrink-0 rounded-full" />
              </div>
              <Skeleton className="h-[0.875rem] w-[88%] max-w-[17rem] rounded-sm" />
              <div className="flex min-w-0 items-baseline gap-1.5">
                <Skeleton className="h-[0.875rem] min-w-0 flex-1 max-w-[72%] rounded-sm" />
                <span className="shrink-0 text-[11px] leading-snug text-muted-foreground/35">
                  ·
                </span>
                <Skeleton className="h-[0.875rem] w-9 shrink-0 rounded-sm tabular-nums" />
              </div>
            </div>
          </div>
        </div>
        <Skeleton className="h-9 w-[4.75rem] shrink-0 rounded-lg" />
      </div>
    </div>
  );
}

function ContractorRowsSkeleton({ count }: { count: number }) {
  return (
    <ul
      className="flex flex-col gap-2"
      aria-busy
      aria-label="Loading contractors"
    >
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <ContractorRowSkeleton />
        </li>
      ))}
    </ul>
  );
}

function LiveSummarySkeleton() {
  return (
    <div
      className="inline-flex min-h-9 max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-border/50 bg-background/70 px-3 py-1.5 text-[11px] leading-snug shadow-sm backdrop-blur-sm"
      aria-hidden
    >
      <Skeleton className="h-[0.875rem] w-[4.5rem] rounded-full" />
      <span className="h-1 w-1 shrink-0 rounded-full bg-border" />
      <Skeleton className="h-[0.875rem] w-14 rounded-full" />
      <span className="h-1 w-1 shrink-0 rounded-full bg-border" />
      <Skeleton className="h-[0.875rem] w-[4.75rem] rounded-full" />
    </div>
  );
}

function CustomKpiSectionSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy>
      <Skeleton className="h-4 w-24" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="min-w-0">
            <CardContent className="flex min-w-0 flex-col gap-1.5 p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function TmetricLiveContractorsPage(props: WithFrontServices) {
  const { services } = props;

  const workspaces = services.workspaceService.useWorkspaces(
    workspaceQueryUtils.ofDefault(),
  );
  const clients = services.clientService.useClients(
    clientQueryUtils.ofDefault(),
  );

  const workspaceIds = useMemo(
    () =>
      rd.map(workspaces, (list) =>
        [...new Set(list.map((w) => w.id))].sort((a, b) => a - b),
      ),
    [workspaces],
  );

  const ids = rd.tryGet(workspaceIds);
  const liveQuery = services.tmetricDashboardService.useLiveContractorsPanel({
    workspaceIds: ids ?? null,
    enabled: ids != null && ids.length > 0,
  });

  const liveData = rd.tryGet(liveQuery);
  const livePanelFetchedAt = liveData ? toJsDate(liveData.fetchedAt) : null;

  const lastPanelRowCount =
    services.preferenceService.useTmetricLiveContractorsPanelLastRowCount();
  const listSkeletonRows = liveSkeletonRowCount(lastPanelRowCount);

  useEffect(() => {
    if (liveData == null) return;
    void services.preferenceService.recordTmetricLiveContractorsPanelLastRowCount(
      liveData.rows.length,
    );
  }, [
    liveData?.rows.length,
    liveData?.fetchedAt,
    services.preferenceService,
    liveData,
  ]);

  const showLiveSummaryPlaceholder =
    liveData == null &&
    (rd.isPending(workspaces) || (ids != null && ids.length > 0));

  const clientNameFn = useMemo(() => {
    const clList = rd.tryGet(clients);
    if (clList == null) return null;
    const clMap = new Map(clList.map((c) => [c.id, c.name]));
    return (clientId: number) => clMap.get(clientId) ?? `Client ${clientId}`;
  }, [clients]);

  const listSkeletonDisplayCount = useMemo(() => {
    if (liveData != null && clientNameFn == null && liveData.rows.length > 0) {
      return liveData.rows.length;
    }
    return listSkeletonRows;
  }, [liveData, clientNameFn, listSkeletonRows]);

  const tmetricCubeExplorerHref = useMemo(() => {
    const path = myRouting
      .forWorkspace(idSpecUtils.ofAll())
      .forClient(idSpecUtils.ofAll())
      .tmetricDashboardCube();
    const search = qs.stringify(dashboardQueryUtils.ofDefault(), {
      allowDots: true,
      encode: true,
      allowEmptyArrays: true,
      strictNullHandling: true,
    });
    return search ? `${path}?${search}` : path;
  }, []);

  const invalidateLive = () => {
    void myQueryClient.invalidateQueries({
      queryKey: [LIVE_PANEL_QUERY_PREFIX],
    });
  };

  const summaryPill = liveData ? (
    <div className="inline-flex min-h-9 max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-border/50 bg-background/70 px-3 py-1.5 text-[11px] leading-snug text-muted-foreground shadow-sm backdrop-blur-sm">
      <span>
        <span className="font-semibold tabular-nums text-foreground">
          {formatHours(liveData.summary.totalHoursLast24h)}
        </span>{" "}
        / 24h
      </span>
      <span className="h-1 w-1 shrink-0 rounded-full bg-border" />
      <span>{liveData.summary.activeTimers} active</span>
      <span className="h-1 w-1 shrink-0 rounded-full bg-border" />
      <span>{liveData.summary.integratedContractors} people</span>
    </div>
  ) : showLiveSummaryPlaceholder ? (
    <LiveSummarySkeleton />
  ) : null;

  // Reuse the dashboard data pipeline (cached TMetric report → contractor summary
  // + contractor name map) so we can render the same Custom KPI cards on this page.
  // Scope is global (all workspaces / all clients) and uses the default dashboard
  // query params (today preset, all active iterations).
  const dashboardData = useTmetricDashboardData({
    services,
    workspaceId: idSpecUtils.ofAll(),
    clientId: idSpecUtils.ofAll(),
  });
  const {
    contractorsSummary,
    contractorNameMap,
    handleRefresh,
    isRefreshing,
    canLoadOrRefresh,
    cachedReportQuery,
    start: kpiStart,
    end: kpiEnd,
  } = dashboardData;

  const kpiPeriodLabel =
    kpiStart && kpiEnd
      ? `${format(kpiStart, "dd MMM")} – ${format(kpiEnd, "dd MMM yyyy")}`
      : null;

  const viewMode = services.preferenceService.useTmetricLivePageViewMode();
  const showTimeline = viewMode === "both" || viewMode === "timeline";
  const showKpis = viewMode === "both" || viewMode === "kpis";
  const timelineFillsViewport = viewMode === "timeline";

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background/50">
      <div className="flex-shrink-0 border-b border-border/60 bg-gradient-to-b from-muted/40 to-muted/10 px-3 py-2 sm:px-6 sm:py-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <MobileSidebarTrigger />
            <Timer className="h-5 w-5 shrink-0 text-primary" />
            <h1 className="min-w-0 truncate text-base font-bold tracking-tight sm:text-xl">
              TMetric live
            </h1>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <TooltipProvider delayDuration={300}>
                <ToggleGroup
                  type="single"
                  size="sm"
                  value={viewMode}
                  onValueChange={(value) => {
                    if (
                      value === "both" ||
                      value === "timeline" ||
                      value === "kpis"
                    ) {
                      void services.preferenceService.setTmetricLivePageViewMode(
                        value,
                      );
                    }
                  }}
                  className="h-8 shrink-0 rounded-lg border border-border/60 bg-background/70 p-0.5 shadow-sm backdrop-blur-sm"
                  aria-label="Live page sections"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem
                        value="timeline"
                        aria-label="Show only the live timeline"
                        className="h-7 px-2 text-xs"
                      >
                        <Rows3 className="size-3.5" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Timeline only</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem
                        value="both"
                        aria-label="Show timeline and KPI cards"
                        className="h-7 px-2 text-xs"
                      >
                        <Columns2 className="size-3.5" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Timeline + KPIs
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem
                        value="kpis"
                        aria-label="Show only the custom KPI cards"
                        className="h-7 px-2 text-xs"
                      >
                        <Gauge className="size-3.5" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">KPIs only</TooltipContent>
                  </Tooltip>
                </ToggleGroup>
              </TooltipProvider>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 rounded-lg"
                    aria-label="More actions"
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    disabled={!showTimeline}
                    onSelect={(event) => {
                      event.preventDefault();
                      invalidateLive();
                    }}
                  >
                    <RefreshCw
                      className={cn(
                        "size-4",
                        rd.isPending(liveQuery) &&
                          liveData == null &&
                          "animate-spin",
                      )}
                    />
                    <span>Refresh live timers</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isRefreshing || !canLoadOrRefresh || !showKpis}
                    onSelect={(event) => {
                      event.preventDefault();
                      handleRefresh();
                    }}
                  >
                    <Database
                      className={cn(
                        "size-4",
                        isRefreshing && "animate-pulse",
                      )}
                    />
                    <span>Refresh KPI source data</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={tmetricCubeExplorerHref}>
                      <ExternalLink className="size-4" />
                      <span>Open TMetric cube</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {summaryPill ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {summaryPill}
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col gap-4 px-3 py-3 sm:px-6 sm:py-4",
          timelineFillsViewport ? "overflow-hidden" : "overflow-y-auto",
        )}
      >
        {showTimeline ? (
          <div
            className={cn(
              "flex min-w-0 flex-col",
              timelineFillsViewport
                ? "min-h-0 flex-1"
                : "min-h-[18rem] sm:min-h-[22rem]",
            )}
          >
            {rd
              .journey(workspaces)
              .wait(
                <ContractorRowsSkeleton count={listSkeletonDisplayCount} />,
              )
              .catch((e) => (
                <p className="px-1 py-4 text-sm text-destructive">
                  <ErrorMessageRenderer error={e} />
                </p>
              ))
              .map(() =>
                ids != null && ids.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
                    No workspaces available.
                  </p>
                ) : (
                  rd
                    .journey(liveQuery)
                    .wait(
                      <ContractorRowsSkeleton
                        count={listSkeletonDisplayCount}
                      />,
                    )
                    .catch((e) => (
                      <p className="px-2 py-3 text-sm text-destructive">
                        <ErrorMessageRenderer error={e} />
                      </p>
                    ))
                    .map((data) => {
                      if (!clientNameFn) {
                        return (
                          <ContractorRowsSkeleton
                            count={listSkeletonDisplayCount}
                          />
                        );
                      }
                      return (
                        <TmetricLiveContractorsTimeline
                          panel={data}
                          clientNameFn={clientNameFn}
                          preferenceService={services.preferenceService}
                          timelineFillViewport={timelineFillsViewport}
                        />
                      );
                    })
                ),
              )}
          </div>
        ) : null}

        {showKpis ? (
          <section
            aria-label="Custom KPIs"
            className="flex min-w-0 flex-col gap-2"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Custom KPIs
              </h2>
              {kpiPeriodLabel ? (
                <span className="text-[10px] tabular-nums text-muted-foreground/80">
                  {kpiPeriodLabel}
                </span>
              ) : null}
            </div>
            {rd
              .journey(rd.combine({ contractorsSummary, contractorNameMap }))
              .wait(<CustomKpiSectionSkeleton />)
              .catch((error) => (
                <Card className="border-destructive">
                  <CardContent className="pt-6 text-destructive">
                    <ErrorMessageRenderer error={error} />
                  </CardContent>
                </Card>
              ))
              .map(
                ({
                  contractorsSummary: resolvedContractorsSummary,
                  contractorNameMap: resolvedContractorNameMap,
                }) => {
                  if (rd.isPending(cachedReportQuery)) {
                    return <CustomKpiSectionSkeleton />;
                  }
                  const cached = rd.tryGet(cachedReportQuery);
                  if (cached == null) {
                    return (
                      <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center gap-2 py-6 text-center text-sm text-muted-foreground">
                          <p>
                            No cached TMetric data yet. Click &quot;Refresh
                            KPIs&quot; to fetch{" "}
                            {kpiPeriodLabel ?? "today's"} data.
                          </p>
                        </CardContent>
                      </Card>
                    );
                  }
                  return (
                    <CustomKpiCards
                      services={services}
                      contractorsSummary={resolvedContractorsSummary}
                      contractorNameMap={resolvedContractorNameMap}
                    />
                  );
                },
              )}
          </section>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/60 bg-muted/25 px-4 py-2 text-[10px] text-muted-foreground sm:px-6">
        {liveData ? (
          <span className="flex min-h-4 min-w-0 items-center truncate text-[10px] leading-snug">
            Updated{" "}
            {livePanelFetchedAt && isValid(livePanelFetchedAt)
              ? formatDistanceToNow(livePanelFetchedAt, { addSuffix: true })
              : "—"}
          </span>
        ) : (
          <Skeleton className="h-2.5 min-h-4 w-36 max-w-[55%] self-center rounded-md" />
        )}
        <span className="hidden text-[10px] text-muted-foreground/80 sm:inline">
          Live view of integrated contractors across all workspaces.
        </span>
      </div>
    </div>
  );
}
