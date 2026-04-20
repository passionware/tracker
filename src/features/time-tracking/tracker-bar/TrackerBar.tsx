import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
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
import type { ContractorStreamState, EntryState } from "@/api/time-event/aggregates";
import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { myRouting } from "@/routing/myRouting.ts";
import { rd } from "@passionware/monads";
import { AlertCircle, AlertTriangle, Pause, Timer, UserCog } from "lucide-react";
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
  const running = rd.tryGet(props.bundle)?.runningPrimary ?? null;
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
            className={cn("size-4", running && "text-emerald-600 animate-pulse")}
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
          {bundle.runningPrimary !== null ? (
            <>
              <RunningRow
                services={props.services}
                contractorId={props.contractorId}
                entry={bundle.runningPrimary}
                serverState={bundle.serverState}
                lane="primary"
                sideQuest={bundle.runningJumpOn}
                jumpOnAction={
                  bundle.runningJumpOn === null ? (
                    <TrackerBarJumpOnPopover
                      services={props.services}
                      contractorId={props.contractorId}
                      primaryEntry={bundle.runningPrimary}
                      serverSnapshot={bundle.serverState}
                    />
                  ) : null
                }
              />
              <RunningIdleSlot
                services={props.services}
                contractorId={props.contractorId}
                entry={bundle.runningPrimary}
                serverState={bundle.serverState}
              />
              {bundle.runningJumpOn !== null ? (
                <RunningRow
                  services={props.services}
                  contractorId={props.contractorId}
                  entry={bundle.runningJumpOn}
                  serverState={bundle.serverState}
                  lane="jump-on"
                  returnsTo={bundle.runningPrimary}
                />
              ) : null}
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
          <span className="truncate">{name ?? `Contractor ${props.contractorId}`}</span>
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
      <span className="text-xs text-muted-foreground">Not tracking</span>
      <TrackerBarStartPopover
        services={props.services}
        contractorId={props.contractorId}
        serverSnapshot={props.serverState}
      />
    </div>
  );
}

/**
 * Threshold (in seconds) after which a jump-on is considered "suspicious"
 * and we surface a "still on your side quest?" nudge. Deliberately a
 * constant for now — promote to PreferenceService if users ask to tune it.
 */
const JUMP_ON_LONG_RUN_THRESHOLD_SECONDS = 30 * 60;

function RunningRow(
  props: WithFrontServices & {
    contractorId: number;
    entry: EntryState;
    serverState: ContractorStreamState;
    /**
     * Visual lane the entry belongs to. The "jump-on" lane is rendered
     * below the primary with amber accents and a "returns to" subtitle
     * so it's unmistakable that stopping it brings the user back to the
     * primary timer (which never paused).
     */
    lane: "primary" | "jump-on";
    /** When present (primary lane only), rendered next to Stop. */
    jumpOnAction?: ReactNode;
    /** The primary entry this jump-on will return to (jump-on lane only). */
    returnsTo?: EntryState;
    /**
     * Running jump-on that depends on this primary (primary lane only).
     * When present, stopping the primary pops a guard dialog so the user
     * can decide whether to stop both or leave the side-quest running.
     */
    sideQuest?: EntryState | null;
  },
) {
  const seconds = useElapsedSeconds(props.entry.startedAt);
  const project = props.services.projectService.useProject(props.entry.projectId);
  const projectName =
    rd.tryGet(project)?.name ?? `Project ${props.entry.projectId}`;
  const returnsToProject = props.services.projectService.useProject(
    props.returnsTo?.projectId,
  );
  const returnsToProjectName =
    rd.tryGet(returnsToProject)?.name ??
    (props.returnsTo ? `Project ${props.returnsTo.projectId}` : null);
  const sideQuestProject = props.services.projectService.useProject(
    props.sideQuest?.projectId,
  );
  const sideQuestProjectName =
    rd.tryGet(sideQuestProject)?.name ??
    (props.sideQuest ? `Project ${props.sideQuest.projectId}` : null);
  const [stopping, setStopping] = useState(false);
  const [guardOpen, setGuardOpen] = useState(false);

  const stopOne = async (entryId: string): Promise<boolean> => {
    const envelope = buildContractorEnvelope({
      contractorId: props.contractorId,
      correlationId: newUuid(),
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
    // Guard: the primary's Stop is intercepted when a side-quest is
    // running so the user doesn't accidentally leave an orphaned jump-on
    // behind. The dialog's actions re-enter via stopPrimaryOnly /
    // stopBoth, bypassing the guard.
    if (props.lane === "primary" && props.sideQuest) {
      setGuardOpen(true);
      return;
    }
    setStopping(true);
    try {
      const ok = await stopOne(props.entry.entryId);
      if (!ok) return;
      toast.success(
        props.lane === "jump-on" && returnsToProjectName
          ? `Side quest done — back on ${returnsToProjectName}`
          : "Timer stopped",
      );
    } finally {
      setStopping(false);
    }
  };

  const stopPrimaryOnly = async () => {
    setGuardOpen(false);
    setStopping(true);
    try {
      const ok = await stopOne(props.entry.entryId);
      if (!ok) return;
      toast.success("Primary stopped — side-quest still running");
    } finally {
      setStopping(false);
    }
  };

  const stopBoth = async () => {
    setGuardOpen(false);
    if (!props.sideQuest) return;
    setStopping(true);
    try {
      // Stop the jump-on first so the primary's stop doesn't need to
      // re-evaluate lineage invariants in the presence of a running
      // dependent. The queue still respects per-aggregate ordering via
      // optimistic concurrency, so a failure on step 1 aborts step 2.
      const jumpOnStopped = await stopOne(props.sideQuest.entryId);
      if (!jumpOnStopped) return;
      const primaryStopped = await stopOne(props.entry.entryId);
      if (!primaryStopped) return;
      toast.success("Both timers stopped");
    } finally {
      setStopping(false);
    }
  };

  const isJumpOn = props.lane === "jump-on";
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
          {isJumpOn && returnsToProjectName ? (
            <span className="truncate text-[10px] text-amber-800/80">
              Returns to {returnsToProjectName} when stopped
            </span>
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
      <div className="flex items-center justify-end gap-1.5">
        {props.jumpOnAction}
        <Button
          size="sm"
          variant="destructive"
          className="h-7 gap-1.5 px-2"
          onClick={handleStop}
          disabled={stopping}
        >
          <Pause className="size-3.5" />
          {stopping ? "Stopping…" : "Stop"}
        </Button>
      </div>
      {props.lane === "primary" && props.sideQuest ? (
        <AlertDialog open={guardOpen} onOpenChange={setGuardOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Your side-quest is still running
              </AlertDialogTitle>
              <AlertDialogDescription>
                {sideQuestProjectName
                  ? `A jump-on timer is running on ${sideQuestProjectName}. What do you want to do?`
                  : "A jump-on timer is still running. What do you want to do?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:justify-end">
              <AlertDialogCancel disabled={stopping}>Cancel</AlertDialogCancel>
              <Button
                variant="outline"
                size="sm"
                onClick={stopPrimaryOnly}
                disabled={stopping}
              >
                Stop primary only
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={stopBoth}
                disabled={stopping}
              >
                Stop both
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
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
function NeedsDetailBadge(
  props: WithFrontServices & { contractorId: number },
) {
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

