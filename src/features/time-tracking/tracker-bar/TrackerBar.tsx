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
import { TrackerBarPendingSheet } from "@/features/time-tracking/tracker-bar/TrackerBarPendingSheet.tsx";
import { TrackerBarStartPopover } from "@/features/time-tracking/tracker-bar/TrackerBarStartPopover.tsx";
import { cn } from "@/lib/utils.ts";
import type { ContractorStreamState, EntryState } from "@/api/time-event/aggregates";
import { contractorQueryUtils } from "@/api/contractor/contractor.api.ts";
import { rd } from "@passionware/monads";
import { Pause, Timer, UserCog } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Sidebar-footer-resident global tracker. Always visible (so users never
 * lose sight of their running timer), three modes:
 *
 *   1. **No identity** → "Track time as…" CTA opens a contractor picker
 *      (persisted via PreferenceService).
 *   2. **Idle** (identity picked, nothing running) → Start popover.
 *   3. **Running** (primary entry in flight) → live elapsed clock + Stop
 *      button. The "return-to" chip slot will surface here once jump-on
 *      lineage exists; for now we render the running entry's project.
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
        <TrackerBarPendingSheet services={props.services} />
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
              />
              <RunningIdleSlot
                services={props.services}
                contractorId={props.contractorId}
                entry={bundle.runningPrimary}
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
          {bundle.runningJumpOn !== null ? (
            <ReturnToChip entry={bundle.runningJumpOn} />
          ) : null}
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

function RunningRow(
  props: WithFrontServices & {
    contractorId: number;
    entry: EntryState;
    serverState: ContractorStreamState;
  },
) {
  const seconds = useElapsedSeconds(props.entry.startedAt);
  const project = props.services.projectService.useProject(props.entry.projectId);
  const projectName =
    rd.tryGet(project)?.name ?? `Project ${props.entry.projectId}`;
  const [stopping, setStopping] = useState(false);

  const handleStop = async () => {
    setStopping(true);
    try {
      const envelope = buildContractorEnvelope({
        contractorId: props.contractorId,
        correlationId: newUuid(),
      });
      const payload = buildEntryStoppedPayload(props.entry.entryId);
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
        return;
      }
      toast.success("Timer stopped");
    } finally {
      setStopping(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <span className="truncate text-sm font-medium">{projectName}</span>
          {props.entry.description ? (
            <span className="truncate text-[11px] text-muted-foreground">
              {props.entry.description}
            </span>
          ) : props.entry.isPlaceholder ? (
            <span className="text-[11px] text-amber-700">Needs detail</span>
          ) : null}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-mono text-xs text-emerald-900 tabular-nums">
              {formatElapsedSeconds(seconds ?? 0)}
            </span>
          </TooltipTrigger>
          <TooltipContent>Started {props.entry.startedAt}</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-center justify-end">
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

function ReturnToChip(props: { entry: EntryState }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
      You're on a side quest — returns to your previous timer when stopped.
      <div className="mt-0.5 text-[10px] opacity-70">
        Side: {props.entry.entryId.slice(0, 8)}…
      </div>
    </div>
  );
}
