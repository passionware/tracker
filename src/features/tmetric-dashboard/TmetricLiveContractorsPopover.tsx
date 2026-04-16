"use client";

import { clientQueryUtils } from "@/api/clients/clients.api";
import { dashboardQueryUtils } from "@/api/tmetric-dashboard-cache/tmetric-dashboard-cache.api";
import { workspaceQueryUtils } from "@/api/workspace/workspace.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Separator } from "@/components/ui/separator.tsx";
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
import type { TmetricLiveContractorRow } from "@/services/front/TmetricDashboardService/TmetricDashboardService";
import { WithTmetricDashboardService } from "@/services/front/TmetricDashboardService/TmetricDashboardService";
import { WithClientService } from "@/services/io/ClientService/ClientService";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService";
import { cn } from "@/lib/utils";
import { WithServices } from "@/platform/typescript/services";
import { rd } from "@passionware/monads";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, Copy, RefreshCw, Timer } from "lucide-react";
import qs from "qs";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const LIVE_PANEL_QUERY_PREFIX = "tmetric_live_contractors_panel" as const;

function formatHours(h: number): string {
  if (h < 0.05) return "0 h";
  if (h < 10) return `${h.toFixed(1)} h`;
  return `${Math.round(h)} h`;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch {
    toast.error("Could not copy");
  }
}

function CopyTextButton({
  text,
  ariaLabel,
  className,
}: {
  text: string;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "h-6 w-6 shrink-0 rounded-md text-muted-foreground hover:bg-muted/80 hover:text-foreground",
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        void copyToClipboard(text);
      }}
      aria-label={ariaLabel}
    >
      <Copy className="size-3" />
    </Button>
  );
}

function ContractorRow({
  row,
  clientLine,
  expandedContractorId,
  onExpandChange,
}: {
  row: TmetricLiveContractorRow;
  /** Display names for all integrated clients (may be several). */
  clientLine: string;
  expandedContractorId: number | null;
  onExpandChange: (contractorId: number, open: boolean) => void;
}) {
  const isOpen = expandedContractorId === row.contractorId;

  const rootTaskLabel =
    !row.error && row.currentTimer
      ? row.currentTimer.label
      : !row.error && row.recentEntries[0]
        ? row.recentEntries[0].label
        : null;

  const primaryCopyText = rootTaskLabel ?? row.fullName;
  const primaryCopyAriaLabel = rootTaskLabel
    ? row.currentTimer
      ? "Copy current task name"
      : "Copy last task name"
    : "Copy contractor name";

  const statusBadge = row.error ? (
    <Badge tone="secondary" variant="destructive" className="shrink-0 leading-none">
      Error
    </Badge>
  ) : row.currentTimer ? (
    <Badge tone="secondary" variant="success" className="shrink-0 leading-none">
      Active
    </Badge>
  ) : (
    <Badge tone="secondary" variant="neutral" className="shrink-0 leading-none">
      Ended
    </Badge>
  );

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={(open) => onExpandChange(row.contractorId, open)}
      className={cn(
        "overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm transition-all duration-200",
        "hover:border-border hover:shadow-md",
        isOpen && "border-primary/20 shadow-md ring-1 ring-primary/10",
      )}
    >
      <div className="flex items-start gap-2.5 p-2.5">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex min-w-0 flex-1 flex-col gap-1 rounded-lg py-0.5 pl-0.5 pr-1 text-left outline-none",
              "hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              "transition-[background-color,box-shadow] duration-150",
              isOpen && "bg-muted/25",
            )}
          >
            <div className="flex gap-2">
              <span
                className={cn(
                  "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground",
                  isOpen && "bg-muted text-foreground",
                )}
              >
                <ChevronRight
                  className={cn(
                    "size-3.5 transition-transform duration-200 ease-out",
                    isOpen && "rotate-90",
                  )}
                />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex w-full min-w-0 items-center gap-1.5">
                  <span className="min-w-0 shrink truncate text-sm font-semibold leading-5 tracking-tight">
                    {row.fullName}
                  </span>
                  {statusBadge}
                </div>
                {!row.error ? (
                  rootTaskLabel ? (
                    <span
                      className={cn(
                        "block min-w-0 truncate text-[11px] leading-snug",
                        row.currentTimer
                          ? "font-medium text-foreground"
                          : "text-muted-foreground",
                      )}
                      title={rootTaskLabel}
                    >
                      {rootTaskLabel}
                    </span>
                  ) : (
                    <span className="text-[11px] italic text-muted-foreground/75">
                      No tasks in last 24h
                    </span>
                  )
                ) : null}
                <div className="flex min-w-0 items-baseline gap-1.5 text-[11px] leading-snug text-muted-foreground">
                  <span className="min-w-0 truncate" title={clientLine}>
                    {clientLine}
                  </span>
                  <span className="shrink-0 text-muted-foreground/40">·</span>
                  <span className="shrink-0 tabular-nums font-medium text-foreground/80">
                    {formatHours(row.last24hHours)}
                  </span>
                </div>
              </div>
            </div>
          </button>
        </CollapsibleTrigger>
        <Button
          type="button"
          variant="default"
          size="sm"
          className="h-9 shrink-0 gap-1.5 rounded-lg px-3 text-xs font-medium shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            void copyToClipboard(primaryCopyText);
          }}
          aria-label={primaryCopyAriaLabel}
        >
          <Copy className="size-3.5 opacity-90" />
          Copy
        </Button>
      </div>
      <CollapsibleContent>
        <div className="space-y-3.5 border-t border-border/40 bg-muted/20 px-4 py-3.5 text-xs">
          {row.error ? (
            <p className="text-destructive leading-relaxed">{row.error}</p>
          ) : null}
          {!row.error && row.currentTimer ? (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">
                Current timer
              </p>
              <div className="flex items-start gap-1">
                <p className="min-w-0 flex-1 font-medium leading-snug text-foreground">
                  {row.currentTimer.label}
                </p>
                <CopyTextButton
                  text={row.currentTimer.label}
                  ariaLabel="Copy current task name"
                />
              </div>
              {row.currentTimer.projectName ? (
                <div className="flex items-start gap-1">
                  <p className="min-w-0 flex-1 text-muted-foreground">
                    {row.currentTimer.projectName}
                  </p>
                  <CopyTextButton
                    text={row.currentTimer.projectName}
                    ariaLabel="Copy project name"
                  />
                </div>
              ) : null}
              <p className="text-muted-foreground">
                Started{" "}
                {formatDistanceToNow(row.currentTimer.startedAt, {
                  addSuffix: true,
                })}
              </p>
            </div>
          ) : null}
          {!row.error && row.recentEntries.length > 0 ? (
            <div className="space-y-2">
              {row.currentTimer ? <Separator /> : null}
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">
                Last 24 hours
              </p>
              <ul className="space-y-2">
                {row.recentEntries.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-lg border border-border/40 bg-background/60 px-2.5 py-2 text-[11px] leading-snug shadow-sm transition-colors hover:border-border/70 hover:bg-background/90"
                  >
                    <div className="flex items-start gap-1">
                      <span className="min-w-0 flex-1 break-words text-foreground">
                        {e.label}
                      </span>
                      <CopyTextButton
                        text={e.label}
                        ariaLabel="Copy task name"
                      />
                    </div>
                    {e.projectName ? (
                      <div className="mt-0.5 flex items-start gap-1">
                        <span className="min-w-0 flex-1 break-words text-muted-foreground">
                          {e.projectName}
                        </span>
                        <CopyTextButton
                          text={e.projectName}
                          ariaLabel="Copy project name"
                        />
                      </div>
                    ) : null}
                    <div className="mt-0.5 tabular-nums text-muted-foreground">
                      {formatHours(e.durationHours)} · ended{" "}
                      {formatDistanceToNow(e.endTime, { addSuffix: true })}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : !row.error && !row.currentTimer ? (
            <p className="text-muted-foreground">No entries in the last 24 hours.</p>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function TmetricLiveContractorsPopover(
  props: WithServices<
    [WithTmetricDashboardService, WithWorkspaceService, WithClientService]
  >,
) {
  const { services } = props;
  const { isMobile } = useSidebar();
  const [open, setOpen] = useState(false);
  const [expandedContractorId, setExpandedContractorId] = useState<number | null>(
    null,
  );

  const workspaces = services.workspaceService.useWorkspaces(
    workspaceQueryUtils.ofDefault(),
  );
  const clients = services.clientService.useClients(clientQueryUtils.ofDefault());

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

  const clientNameFn = useMemo(() => {
    const clList = rd.tryGet(clients);
    if (clList == null) return null;
    const clMap = new Map(clList.map((c) => [c.id, c.name]));
    return (clientId: number) =>
      clMap.get(clientId) ?? `Client ${clientId}`;
  }, [clients]);

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

  const onExpandChange = useCallback((contractorId: number, next: boolean) => {
    setExpandedContractorId(next ? contractorId : null);
  }, []);

  const invalidateLive = () => {
    void myQueryClient.invalidateQueries({
      queryKey: [LIVE_PANEL_QUERY_PREFIX],
    });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setExpandedContractorId(null);
          }}
        >
          <PopoverTrigger asChild>
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
          </PopoverTrigger>
          <PopoverContent
            className="w-[min(100vw-2rem,33rem)] max-w-[min(100vw-2rem,33rem)] overflow-hidden rounded-xl border border-border/60 p-0 shadow-xl ring-1 ring-black/5 dark:ring-white/10"
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={10}
          >
            <div className="border-b border-border/60 bg-gradient-to-b from-muted/40 to-muted/10 px-4 py-4">
              <p className="text-base font-semibold tracking-tight text-foreground">
                Contractors
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                TMetric-integrated people on active iterations in your workspaces.
              </p>
              <Link
                to={tmetricCubeExplorerHref}
                className="mt-3 inline-flex max-w-full flex-wrap items-baseline gap-x-1 rounded-md py-0.5 text-xs font-medium text-primary underline-offset-4 transition-colors hover:bg-primary/5 hover:underline"
                onClick={() => setOpen(false)}
              >
                Open TMetric cube
                <span className="font-normal text-muted-foreground no-underline">
                  · all workspaces · all clients · today
                </span>
              </Link>
              {liveData ? (
                <div className="mt-3 inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-border/50 bg-background/70 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur-sm">
                  <span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatHours(liveData.summary.totalHoursLast24h)}
                    </span>{" "}
                    / 24h
                  </span>
                  <span className="h-1 w-1 shrink-0 rounded-full bg-border" />
                  <span>
                    {liveData.summary.activeTimers} active
                  </span>
                  <span className="h-1 w-1 shrink-0 rounded-full bg-border" />
                  <span>{liveData.summary.integratedContractors} people</span>
                </div>
              ) : open && ids != null && ids.length > 0 ? (
                <div className="mt-3 flex gap-2">
                  <Skeleton className="h-8 w-40 rounded-full" />
                </div>
              ) : null}
            </div>

            <div className="max-h-[min(70vh,30rem)] overflow-y-auto bg-background/50 px-3 py-3">
              {!open ? null : rd
                .journey(workspaces)
                .wait(
                  <div className="space-y-2 px-1 py-2">
                    <Skeleton className="h-[4.25rem] w-full rounded-xl" />
                    <Skeleton className="h-[4.25rem] w-full rounded-xl" />
                  </div>,
                )
                .catch((e) => (
                  <p className="px-1 py-4 text-sm text-destructive">{e.message}</p>
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
                        <div className="space-y-2 px-1 py-1">
                          <Skeleton className="h-[4.25rem] w-full rounded-xl" />
                          <Skeleton className="h-[4.25rem] w-full rounded-xl" />
                          <Skeleton className="h-[4.25rem] w-full rounded-xl" />
                        </div>,
                      )
                      .catch((e) => (
                        <p className="px-2 py-3 text-sm text-destructive">
                          {e.message}
                        </p>
                      ))
                      .map((data) =>
                        data.rows.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
                            No integrated contractors in scope.
                          </p>
                        ) : !clientNameFn ? (
                          <div className="space-y-2 px-1 py-1">
                            <Skeleton className="h-[4.25rem] w-full rounded-xl" />
                            <Skeleton className="h-[4.25rem] w-full rounded-xl" />
                          </div>
                        ) : (
                          <ul className="flex flex-col gap-2">
                            {data.rows.map((row) => (
                              <li key={row.contractorId}>
                                <ContractorRow
                                  row={row}
                                  clientLine={row.clientIds
                                    .map((id) => clientNameFn(id))
                                    .join(" · ")}
                                  expandedContractorId={expandedContractorId}
                                  onExpandChange={onExpandChange}
                                />
                              </li>
                            ))}
                          </ul>
                        ),
                      ),
                  ),
                )}
            </div>

            {open ? (
              <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/25 px-4 py-2.5 text-[10px] text-muted-foreground">
                {liveData ? (
                  <span className="min-w-0 truncate">
                    Updated{" "}
                    {formatDistanceToNow(liveData.fetchedAt, {
                      addSuffix: true,
                    })}
                  </span>
                ) : (
                  <span>Loading…</span>
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
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
