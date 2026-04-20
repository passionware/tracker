"use client";

import { clientQueryUtils } from "@/api/clients/clients.api";
import { dashboardQueryUtils } from "@/api/tmetric-dashboard-cache/tmetric-dashboard-cache.api";
import { workspaceQueryUtils } from "@/api/workspace/workspace.api";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet.tsx";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { myQueryClient } from "@/core/query.connected.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { myRouting } from "@/routing/myRouting.ts";
import { WithTmetricDashboardService } from "@/services/front/TmetricDashboardService/TmetricDashboardService";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService";
import { WithClientService } from "@/services/io/ClientService/ClientService";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService";
import { cn } from "@/lib/utils";
import { WithServices } from "@/platform/typescript/services";
import { rd } from "@passionware/monads";
import { TmetricLiveContractorsTimeline } from "@/features/tmetric-dashboard/TmetricLiveContractorsTimeline.tsx";
import { formatDistanceToNow, isValid } from "date-fns";
import { RefreshCw, Timer } from "lucide-react";
import qs from "qs";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

function toJsDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value);
  }
  return new Date(NaN);
}

const LIVE_PANEL_QUERY_PREFIX = "tmetric_live_contractors_panel" as const;

function formatHours(h: number): string {
  if (h < 0.05) return "0 h";
  if (h < 10) return `${h.toFixed(1)} h`;
  return `${Math.round(h)} h`;
}

function contractorPanelSkeletonRowCount(lastStored: number | null): number {
  if (lastStored == null) {
    return 3;
  }
  if (lastStored === 0) {
    return 1;
  }
  return Math.min(lastStored, 60);
}

/** Mirrors contractor lane + track row height for loading placeholders. */
function ContractorRowSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm min-h-[5.5rem]",
        className,
      )}
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

/** Mirrors the summary pill: hours / 24h · active · people. */
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

export function TmetricLiveContractorsPopover(
  props: WithServices<
    [
      WithTmetricDashboardService,
      WithWorkspaceService,
      WithClientService,
      WithPreferenceService,
    ]
  >,
) {
  const { services } = props;
  const { isMobile } = useSidebar();
  const [open, setOpen] = useState(false);

  const onLivePanelOpenChange = (next: boolean) => {
    setOpen(next);
  };

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
    enabled: open && ids != null && ids.length > 0,
  });

  const liveData = rd.tryGet(liveQuery);
  const livePanelFetchedAt = liveData ? toJsDate(liveData.fetchedAt) : null;

  const lastPanelRowCount =
    services.preferenceService.useTmetricLiveContractorsPanelLastRowCount();
  const listSkeletonRows = contractorPanelSkeletonRowCount(lastPanelRowCount);

  useEffect(() => {
    if (!open || liveData == null) {
      return;
    }
    void services.preferenceService.recordTmetricLiveContractorsPanelLastRowCount(
      liveData.rows.length,
    );
  }, [
    open,
    liveData?.rows.length,
    liveData?.fetchedAt,
    services.preferenceService,
  ]);

  const showLiveSummaryPlaceholder =
    open &&
    liveData == null &&
    (rd.isPending(workspaces) || (ids != null && ids.length > 0));

  const listBodyLoading =
    open &&
    liveData == null &&
    (rd.isPending(workspaces) ||
      (ids != null && ids.length > 0 && rd.isPending(liveQuery)));

  const clientNameFn = useMemo(() => {
    const clList = rd.tryGet(clients);
    if (clList == null) return null;
    const clMap = new Map(clList.map((c) => [c.id, c.name]));
    return (clientId: number) => clMap.get(clientId) ?? `Client ${clientId}`;
  }, [clients]);

  /** While clients load after live rows exist, match skeleton count to row count to avoid shrink. */
  const listSkeletonDisplayCount = useMemo(() => {
    if (liveData != null && clientNameFn == null && liveData.rows.length > 0) {
      return liveData.rows.length;
    }
    return listSkeletonRows;
  }, [liveData, clientNameFn, listSkeletonRows]);

  const listAreaReserveMinHeight =
    open &&
    (listBodyLoading ||
      (liveData != null && clientNameFn == null && liveData.rows.length > 0));

  const listMinHeightStyle =
    listAreaReserveMinHeight && listSkeletonDisplayCount > 0
      ? ({
          minHeight: `calc(${listSkeletonDisplayCount} * 5rem + ${listSkeletonDisplayCount - 1} * 0.5rem)`,
        } as const)
      : undefined;

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

  const liveMenuTrigger = (
    <SidebarMenuButton
      size="lg"
      tooltip={{ children: "TMetric live — timers & last 24h" }}
      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
    >
      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <Timer className="size-4" />
      </div>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-semibold">TMetric live</span>
        <span className="truncate text-xs text-muted-foreground">
          Timers & 24h activity
        </span>
      </div>
    </SidebarMenuButton>
  );

  const livePanelBody = (
    <>
      <div className="border-b border-border/60 bg-gradient-to-b from-muted/40 to-muted/10 px-4 py-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-x-4 sm:gap-y-2">
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-tight text-foreground">
              Contractors
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              One lane per contractor — last 24h of TMetric time on the tracks,
              with status and clients in each lane label.
            </p>
          </div>
          <div className="flex min-h-9 items-center sm:justify-self-end">
            {liveData ? (
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
            ) : null}
          </div>
          <div className="min-w-0 sm:col-span-2">
            <Link
              to={tmetricCubeExplorerHref}
              className="inline-flex max-w-full flex-wrap items-baseline gap-x-1 rounded-md py-0.5 text-xs font-medium text-primary underline-offset-4 transition-colors hover:bg-primary/5 hover:underline"
              onClick={() => setOpen(false)}
            >
              Open TMetric cube
              <span className="font-normal text-muted-foreground no-underline">
                · all workspaces · all clients · today
              </span>
            </Link>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "px-3 py-3 bg-background/50",
          isMobile
            ? cn(
                "flex min-h-0 flex-1 flex-col",
                liveData != null && clientNameFn != null
                  ? "overflow-hidden"
                  : "overflow-y-auto",
              )
            : liveData != null && clientNameFn != null
              ? "overflow-hidden"
              : "max-h-[min(70vh,30rem)] overflow-y-auto",
        )}
        style={listMinHeightStyle}
      >
        {!open
          ? null
          : rd
              .journey(workspaces)
              .wait(<ContractorRowsSkeleton count={listSkeletonDisplayCount} />)
              .catch((e) => (
                <p className="px-1 py-4 text-sm text-destructive">
                  {e.message}
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
                        {e.message}
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
                          timelineFillViewport={isMobile}
                        />
                      );
                    })
                ),
              )}
      </div>

      {open ? (
        <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/25 px-4 py-2.5 text-[10px] text-muted-foreground">
          {liveData ? (
            <span className="flex min-h-4 min-w-0 items-center truncate text-[10px] leading-snug">
              Updated{" "}
              {livePanelFetchedAt && isValid(livePanelFetchedAt)
                ? formatDistanceToNow(livePanelFetchedAt, {
                    addSuffix: true,
                  })
                : "—"}
            </span>
          ) : (
            <Skeleton className="h-2.5 min-h-4 w-36 max-w-[55%] self-center rounded-md" />
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 shrink-0 gap-1.5 rounded-lg px-3 text-xs font-medium shadow-sm"
            onClick={() => invalidateLive()}
          >
            <RefreshCw className="size-3.5 opacity-80" />
            Refresh
          </Button>
        </div>
      ) : null}
    </>
  );

  const mobileLiveSheetSurfaceClass = cn(
    "flex w-full flex-col gap-0 overflow-hidden rounded-none border-0 p-0 shadow-xl",
    "h-[100dvh] max-h-[100dvh]",
    "pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)]",
    "[&>button]:right-3 [&>button]:top-3 [&>button]:z-50",
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {isMobile ? (
          <Sheet open={open} onOpenChange={onLivePanelOpenChange}>
            <SheetTrigger asChild>{liveMenuTrigger}</SheetTrigger>
            <SheetContent side="bottom" className={mobileLiveSheetSurfaceClass}>
              <SheetHeader className="sr-only">
                <SheetTitle>TMetric live contractors</SheetTitle>
              </SheetHeader>
              {livePanelBody}
            </SheetContent>
          </Sheet>
        ) : (
          <Popover open={open} onOpenChange={onLivePanelOpenChange}>
            <PopoverTrigger asChild>{liveMenuTrigger}</PopoverTrigger>
            <PopoverContent
              className="w-[min(100vw-2rem,77rem)] max-w-[min(100vw-2rem,77rem)] overflow-hidden rounded-xl border border-border/60 p-0 shadow-xl ring-1 ring-black/5 dark:ring-white/10"
              side="right"
              align="start"
              sideOffset={10}
            >
              {livePanelBody}
            </PopoverContent>
          </Popover>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
