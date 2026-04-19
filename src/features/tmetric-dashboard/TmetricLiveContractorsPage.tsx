import { clientQueryUtils } from "@/api/clients/clients.api";
import { dashboardQueryUtils } from "@/api/tmetric-dashboard-cache/tmetric-dashboard-cache.api";
import { workspaceQueryUtils } from "@/api/workspace/workspace.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WithFrontServices } from "@/core/frontServices";
import { myQueryClient } from "@/core/query.connected";
import { MobileSidebarTrigger } from "@/features/_common/MobileSidebarTrigger";
import { TmetricLiveContractorsTimeline } from "@/features/tmetric-dashboard/TmetricLiveContractorsTimeline";
import { cn } from "@/lib/utils";
import { idSpecUtils } from "@/platform/lang/IdSpec";
import { ErrorMessageRenderer } from "@/platform/react/ErrorMessageRenderer";
import { myRouting } from "@/routing/myRouting";
import { rd } from "@passionware/monads";
import { formatDistanceToNow, isValid } from "date-fns";
import { RefreshCw, Timer } from "lucide-react";
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

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background/50">
      <div className="flex-shrink-0 border-b border-border/60 bg-gradient-to-b from-muted/40 to-muted/10 px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <MobileSidebarTrigger />
              <Timer className="h-5 w-5 shrink-0 text-primary" />
              <h1 className="text-lg font-bold tracking-tight sm:text-2xl">
                TMetric live
              </h1>
              <Badge variant="secondary">BETA</Badge>
            </div>
            <p className="mt-1 hidden text-pretty text-sm text-muted-foreground sm:block">
              One lane per contractor — last 24h of TMetric time on the tracks,
              with status and clients in each lane label.
            </p>
            <Link
              to={tmetricCubeExplorerHref}
              className="mt-1 inline-flex max-w-full flex-wrap items-baseline gap-x-1 rounded-md py-0.5 text-xs font-medium text-primary underline-offset-4 transition-colors hover:bg-primary/5 hover:underline"
            >
              Open TMetric cube
              <span className="font-normal text-muted-foreground no-underline">
                · all workspaces · all clients · today
              </span>
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {summaryPill}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 shrink-0 gap-1.5 rounded-lg px-3 text-xs font-medium shadow-sm"
              onClick={() => invalidateLive()}
            >
              <RefreshCw
                className={cn(
                  "size-3.5 opacity-80",
                  rd.isPending(liveQuery) && liveData == null && "animate-spin",
                )}
              />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4">
        {rd
          .journey(workspaces)
          .wait(<ContractorRowsSkeleton count={listSkeletonDisplayCount} />)
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
                  <ContractorRowsSkeleton count={listSkeletonDisplayCount} />,
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
                      timelineFillViewport
                    />
                  );
                })
            ),
          )}
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
