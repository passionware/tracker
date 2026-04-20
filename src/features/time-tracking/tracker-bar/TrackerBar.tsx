import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import type { WithFrontServices } from "@/core/frontServices.ts";
import { renderError } from "@/features/_common/renderError.tsx";
import {
  formatElapsedSeconds,
  useElapsedSeconds,
} from "@/features/time-tracking/_common/useElapsedSeconds.ts";
import { useOptimisticContractorBundle } from "@/features/time-tracking/_common/useOptimisticActiveEntry.ts";
import {
  buildContractorEnvelope,
  buildEntryStoppedPayload,
  newUuid,
} from "@/features/time-tracking/_common/trackerCommands.ts";
import { TrackerBarContractorPicker } from "@/features/time-tracking/tracker-bar/TrackerBarContractorPicker.tsx";
import { TrackerBarIdlePrompt } from "@/features/time-tracking/tracker-bar/TrackerBarIdlePrompt.tsx";
import { TrackerBarJumpOnPopover } from "@/features/time-tracking/tracker-bar/TrackerBarJumpOnPopover.tsx";
import { TrackerBarPendingSheet } from "@/features/time-tracking/tracker-bar/TrackerBarPendingSheet.tsx";
import { TrackerBarStartPopover } from "@/features/time-tracking/tracker-bar/TrackerBarStartPopover.tsx";
import { cn } from "@/lib/utils.ts";
import type {
  ContractorStreamState,
  EntryState,
} from "@/api/time-event/aggregates";
import type { ContractorEventPayload } from "@/api/time-event/time-event.api.ts";
import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { myRouting } from "@/routing/myRouting.ts";
import { rd } from "@passionware/monads";
import {
  AlertCircle,
  AlertTriangle,
  Pause,
  Timer,
  Undo2,
  UserCog,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

/**
 * Sidebar-footer-resident global tracker. Always visible (so users never
 * lose sight of their running timer), three modes:
 *
 *   1. **No identity** → "Track time as…" CTA opens a contractor picker
 *      (persisted via PreferenceService).
 *   2. **Idle** (identity picked, nothing running) → Start popover.
 *   3. **Running** (primary entry in flight) → live elapsed clock + Stop
 *      button, plus a "Jump on…" CTA that opens a side-quest picker.
 *      When a jump-on is already running, a second amber lane appears
 *      underneath with its own Stop button and a "returns to" hint.
 *
 * The bar is render-cheap: it folds the contractor's offline queue tail
 * onto the server's projection (`useOptimisticContractorBundle`) so the
 * three-mode swap is instant on click — the Stop button doesn't have to
 * wait for the worker to round-trip.
 */
export function TrackerBar(props: WithFrontServices) {
  const { state: sidebarState } = useSidebar();
  const collapsed = sidebarState === "collapsed";
  const contractorId =
    props.services.preferenceService.useTrackerActiveContractorId();
  const bundle = useOptimisticContractorBundle(props, contractorId);

  if (collapsed) {
    return <CollapsedTrackerBar {...props} bundle={bundle} />;
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <Timer className="size-3.5" />
          Tracker
        </div>
        <div className="flex items-center gap-1.5">
          {contractorId !== null ? (
            <NeedsDetailBadge
              services={props.services}
              contractorId={contractorId}
            />
          ) : null}
          <TrackerBarPendingSheet services={props.services} />
        </div>
      </div>
      {contractorId === null ? (
        <TrackerBarContractorPicker services={props.services} />
      ) : (
        <ActiveTrackerArea
          {...props}
          contractorId={contractorId}
          bundle={bundle}
        />
      )}
    </div>
  );
}

function CollapsedTrackerBar(
  props: WithFrontServices & {
    bundle: ReturnType<typeof useOptimisticContractorBundle>;
  },
) {
  const running = rd.tryGet(props.bundle)?.runningEntry ?? null;
  const seconds = useElapsedSeconds(running?.startedAt ?? null);
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          tooltip={{
            children: running
              ? `Tracking ${formatElapsedSeconds(seconds ?? 0)}`
              : "Tracker — open the sidebar to start",
          }}
          className={cn(
            running &&
              "bg-emerald-50 text-emerald-900 data-[active=true]:bg-emerald-50",
          )}
        >
          <Timer
            className={cn(
              "size-4",
              running && "text-emerald-600 animate-pulse",
            )}
          />
          <span>{running ? "Running" : "Tracker"}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function ActiveTrackerArea(
  props: WithFrontServices & {
    contractorId: number;
    bundle: ReturnType<typeof useOptimisticContractorBundle>;
  },
) {
  return rd
    .journey(props.bundle)
    .wait(<Skeleton className="h-9 w-full" />)
    .catch(renderError)
    .map((bundle) => {
      if (bundle === null) {
        return (
          <TrackerBarContractorPicker
            services={props.services}
            variant="compact"
          />
        );
      }
      return (
        <div className="flex flex-col gap-2">
          <ContractorChip
            services={props.services}
            contractorId={props.contractorId}
          />
          {bundle.runningEntry !== null ? (
            <>
              <RunningRow
                services={props.services}
                contractorId={props.contractorId}
                entry={bundle.runningEntry}
                serverState={bundle.serverState}
                jumpOnAction={
                  <TrackerBarJumpOnPopover
                    services={props.services}
                    contractorId={props.contractorId}
                    primaryEntry={bundle.runningEntry}
                    serverSnapshot={bundle.serverState}
                  />
                }
              />
              <RunningIdleSlot
                services={props.services}
                contractorId={props.contractorId}
                entry={bundle.runningEntry}
                serverState={bundle.serverState}
              />
            </>
          ) : (
            <IdleRow
              services={props.services}
              contractorId={props.contractorId}
              serverState={bundle.serverState}
            />
          )}
        </div>
      );
    });
}

function ContractorChip(props: WithFrontServices & { contractorId: number }) {
  const contractors = props.services.contractorService.useContractors(
    contractorQueryUtils.ofEmpty(),
  );
  const [open, setOpen] = useState(false);
  const name = rd
    .tryGet(contractors)
    ?.find((c) => c.id === props.contractorId)?.fullName;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md px-1 py-0.5 text-xs text-muted-foreground hover:bg-sidebar-accent"
        >
          <Avatar className="size-5">
            <AvatarImage alt="" />
            <AvatarFallback className="text-[9px]">
              {(name ?? "?").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">
            {name ?? `Contractor ${props.contractorId}`}
          </span>
          <UserCog className="ml-auto size-3.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <PopoverHeader>Track time as</PopoverHeader>
        <TrackerBarContractorPicker services={props.services} />
      </PopoverContent>
    </Popover>
  );
}

function IdleRow(
  props: WithFrontServices & {
    contractorId: number;
    serverState: ContractorStreamState;
  },
) {
  return (
    <div className="flex items-center justify-between gap-2">
      {/* <span className="text-xs text-muted-foreground">Not tracking</span> */}
      <div className="flex items-center gap-1">
        {/*
          Jump-on is available from idle too: hopping into what a teammate
          is doing is often the reason you open the tracker in the first
          place. Without a primary to return to, the new entry is just a
          standalone start on the teammate's project.
        */}
        <TrackerBarJumpOnPopover
          services={props.services}
          contractorId={props.contractorId}
          primaryEntry={null}
          serverSnapshot={props.serverState}
        />
        <TrackerBarStartPopover
          services={props.services}
          contractorId={props.contractorId}
          serverSnapshot={props.serverState}
        />
      </div>
    </div>
  );
}

/**
 * Threshold (in seconds) after which a jump-on is considered "suspicious"
 * and we surface a "still on your side quest?" nudge. Deliberately a
 * constant for now — promote to PreferenceService if users ask to tune it.
 */
const JUMP_ON_LONG_RUN_THRESHOLD_SECONDS = 30 * 60;

/**
 * Single running row. Under the one-running-entry invariant the tracker
 * never shows two parallel lanes — a jump-on is just the current running
 * entry that happens to carry an `interruptedEntryId` pointer, so on stop
 * we can offer "Resume <prior project>" which fires a stop-then-start
 * pivot (same correlationId) and lands the user back on the interrupted
 * routing in a brand-new entry (`resumedFromEntryId`).
 */
function RunningRow(
  props: WithFrontServices & {
    contractorId: number;
    entry: EntryState;
    serverState: ContractorStreamState;
    /** Rendered next to Stop (jump-on CTA). */
    jumpOnAction?: ReactNode;
  },
) {
  const seconds = useElapsedSeconds(props.entry.startedAt);
  const project = props.services.projectService.useProject(
    props.entry.projectId,
  );
  const projectName =
    rd.tryGet(project)?.name ?? `Project ${props.entry.projectId}`;

  const isJumpOn = props.entry.interruptedEntryId !== null;
  // For a jump-on, resolve the entry it returns to (a stopped entry, so
  // we can't rely on the `active entry` projection — fetch by id).
  const returnsToEntry = props.services.timeEntryService.useEntry(
    isJumpOn ? props.entry.interruptedEntryId : undefined,
  );
  const returnsToEntryValue = rd.tryGet(returnsToEntry) ?? null;
  const returnsToProject = props.services.projectService.useProject(
    returnsToEntryValue?.projectId,
  );
  const returnsToProjectName =
    rd.tryGet(returnsToProject)?.name ??
    (returnsToEntryValue ? `Project ${returnsToEntryValue.projectId}` : null);

  const [stopping, setStopping] = useState(false);

  const stopOne = async (
    entryId: string,
    correlationId: string,
  ): Promise<boolean> => {
    const envelope = buildContractorEnvelope({
      contractorId: props.contractorId,
      correlationId,
    });
    const payload = buildEntryStoppedPayload(entryId);
    const outcome =
      await props.services.eventQueueService.submitContractorEvent(
        envelope,
        payload,
        { serverSnapshot: props.serverState },
      );
    if (outcome.kind === "rejected_locally") {
      toast.error(
        `Couldn't stop: ${outcome.errors.map((e) => e.message).join("; ")}`,
      );
      return false;
    }
    return true;
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      const ok = await stopOne(props.entry.entryId, newUuid());
      if (!ok) return;
      toast.success(
        isJumpOn && returnsToProjectName
          ? `Side quest done — ${returnsToProjectName} is waiting`
          : "Timer stopped",
      );
    } finally {
      setStopping(false);
    }
  };

  /**
   * Stop the current jump-on and immediately start a fresh entry whose
   * routing is copied from the interrupted entry (the one the user
   * jumped away from). Both events share a correlationId so audit
   * replay sees the pivot as one gesture. The new entry's
   * `resumedFromEntryId` points at the original interrupted entry so
   * downstream reports can reconstruct the "jump-on → come back"
   * lineage.
   */
  const handleResume = async () => {
    if (!returnsToEntryValue) {
      toast.error("Couldn't find the previous entry to return to");
      return;
    }
    setStopping(true);
    try {
      const correlationId = newUuid();
      const stopped = await stopOne(props.entry.entryId, correlationId);
      if (!stopped) return;
      const startEnvelope = buildContractorEnvelope({
        contractorId: props.contractorId,
        correlationId,
      });
      const startPayload: ContractorEventPayload = {
        type: "EntryStarted",
        entryId: newUuid(),
        clientId: returnsToEntryValue.clientId,
        workspaceId: returnsToEntryValue.workspaceId,
        projectId: returnsToEntryValue.projectId,
        task:
          returnsToEntryValue.taskId !== null &&
          returnsToEntryValue.taskVersion !== null
            ? {
                taskId: returnsToEntryValue.taskId,
                taskVersion: returnsToEntryValue.taskVersion,
              }
            : undefined,
        activity:
          returnsToEntryValue.activityId !== null &&
          returnsToEntryValue.activityVersion !== null
            ? {
                activityId: returnsToEntryValue.activityId,
                activityVersion: returnsToEntryValue.activityVersion,
              }
            : undefined,
        startedAt: new Date().toISOString(),
        rate: returnsToEntryValue.rateSnapshot,
        // If task/activity are missing we ship a placeholder so the
        // "needs detail" badge shows up — lets the user disambiguate
        // before submission.
        isPlaceholder:
          returnsToEntryValue.taskId === null ||
          returnsToEntryValue.activityId === null,
        resumedFromEntryId: returnsToEntryValue.id,
      };
      const outcome =
        await props.services.eventQueueService.submitContractorEvent(
          startEnvelope,
          startPayload,
          { serverSnapshot: props.serverState },
        );
      if (outcome.kind === "rejected_locally") {
        toast.error(
          `Couldn't resume: ${outcome.errors.map((e) => e.message).join("; ")}`,
        );
        return;
      }
      toast.success(
        returnsToProjectName ? `Back on ${returnsToProjectName}` : "Resumed",
      );
    } finally {
      setStopping(false);
    }
  };

  const isLongRunningJumpOn =
    isJumpOn && (seconds ?? 0) >= JUMP_ON_LONG_RUN_THRESHOLD_SECONDS;
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        isJumpOn &&
          "rounded-md border border-amber-200 bg-amber-50/70 px-2 py-1.5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <span
            className={cn(
              "truncate text-sm font-medium",
              isJumpOn && "text-amber-900",
            )}
          >
            {isJumpOn ? (
              <span className="mr-1 inline-flex items-center gap-1 rounded-sm bg-amber-200 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-900">
                Jump-on
              </span>
            ) : null}
            {projectName}
          </span>
          {props.entry.description ? (
            <span className="truncate text-[11px] text-muted-foreground">
              {props.entry.description}
            </span>
          ) : props.entry.isPlaceholder ? (
            <span className="text-[11px] text-amber-700">Needs detail</span>
          ) : null}
          {/*
            Lineage hint. Kept intentionally short — the Resume button
            below is the primary affordance, so this line just reassures
            the user that "come back" is available without eating the
            narrow sidebar column. Tooltip carries the full name.
          */}
          {isJumpOn && returnsToProjectName ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex max-w-full items-center gap-1 truncate text-[10px] text-amber-800/80">
                  <Undo2 className="size-3 shrink-0" />
                  <span className="truncate">{returnsToProjectName}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Came from {returnsToProjectName} — stop or resume to come back
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {isLongRunningJumpOn ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 animate-pulse"
                  aria-label="Long-running side-quest"
                >
                  <AlertTriangle className="size-3" />
                  Don't forget
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {returnsToProjectName
                  ? `You've been on this side-quest for ${formatElapsedSeconds(seconds ?? 0)} — consider returning to ${returnsToProjectName}.`
                  : `You've been on this side-quest for ${formatElapsedSeconds(seconds ?? 0)}.`}
              </TooltipContent>
            </Tooltip>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 font-mono text-xs tabular-nums",
                  isJumpOn
                    ? "bg-amber-200 text-amber-900"
                    : "bg-emerald-100 text-emerald-900",
                )}
              >
                {formatElapsedSeconds(seconds ?? 0)}
              </span>
            </TooltipTrigger>
            <TooltipContent>Started {props.entry.startedAt}</TooltipContent>
          </Tooltip>
        </div>
      </div>
      {/*
        Action row: flex-wrap so we don't clip when the sidebar is narrow
        (up to three buttons can appear when a jump-on is active and the
        user wants to jump again).
      */}
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {props.jumpOnAction}
        {isJumpOn && returnsToEntryValue ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 w-7 shrink-0 px-0"
                onClick={handleResume}
                disabled={stopping}
                aria-label={
                  returnsToProjectName
                    ? `Resume ${returnsToProjectName}`
                    : "Resume previous entry"
                }
              >
                <Undo2 className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {stopping
                ? "Resuming…"
                : returnsToProjectName
                  ? `Resume ${returnsToProjectName}`
                  : "Resume previous entry"}
            </TooltipContent>
          </Tooltip>
        ) : null}
        <Button
          size="sm"
          variant="destructive"
          className="h-7 shrink-0 gap-1.5 px-2"
          onClick={handleStop}
          disabled={stopping}
        >
          <Pause className="size-3.5" />
          {stopping ? "Stopping…" : "Stop"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Renders the "still working?" prompt only when the IdleDetectionService
 * reports the user is idle. Lives next to the running row so the prompt
 * appears underneath the live timer (same visual block, no layout shift
 * when it appears/disappears beyond the prompt's own height).
 */
function RunningIdleSlot(
  props: WithFrontServices & {
    contractorId: number;
    entry: EntryState;
    serverState: ContractorStreamState;
  },
) {
  const thresholdSeconds =
    props.services.preferenceService.useTrackerIdleThresholdSeconds();
  const idle =
    props.services.idleDetectionService.useIdleState(thresholdSeconds);
  if (!idle.isIdle) return null;
  return (
    <TrackerBarIdlePrompt
      services={props.services}
      contractorId={props.contractorId}
      entry={props.entry}
      serverState={props.serverState}
      secondsSinceActivity={idle.secondsSinceActivity}
      lastActivityAt={idle.lastActivityAt}
    />
  );
}

/**
 * Amber pill that counts how many of the contractor's entries still need
 * task/activity filled in. Placeholder entries can't be submitted for
 * approval — surfacing this number in the always-visible bar stops them
 * from silently piling up. The pill is a link straight to the Mine page
 * so the user is one click away from the editor sheet.
 */
function NeedsDetailBadge(props: WithFrontServices & { contractorId: number }) {
  const query = useMemo(
    () => ({
      contractorId: props.contractorId,
      onlyPlaceholders: true,
      limit: 50,
    }),
    [props.contractorId],
  );
  const entries = props.services.timeEntryService.useEntries(query);
  const count = rd.tryGet(entries)?.length ?? 0;
  if (count === 0) return null;
  const href = myRouting
    .forWorkspace(idSpecUtils.ofAll())
    .forClient(idSpecUtils.ofAll())
    .timeTrackingMine();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={href}
          className="inline-flex h-5 items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-1.5 text-[10px] font-medium text-amber-800 hover:bg-amber-100"
        >
          <AlertCircle className="size-3" />
          <span className="tabular-nums">{count}</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent>
        {count === 1
          ? "1 entry needs detail — click to fix"
          : `${count} entries need detail — click to fix`}
      </TooltipContent>
    </Tooltip>
  );
}
