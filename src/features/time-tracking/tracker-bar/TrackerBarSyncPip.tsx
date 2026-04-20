import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";
import type { EventQueueState } from "@/services/io/EventQueueService/EventQueueService.ts";
import { CheckCircle2, CloudOff, Loader2, Triangle } from "lucide-react";

/**
 * Compact "where are my events?" pip used in the TrackerBar footer slot.
 *
 * Five visual states, in priority order — the highest matching condition
 * wins. We deliberately collapse "currently in flight" with "any pending"
 * because users care about "is anything still in transit?" rather than the
 * detailed lifecycle of each row (the pending drawer surfaces those).
 *
 *   1. failed (validation/transient lingering past first attempt) — red
 *   2. offline (queue tried & got transient_failure, hasn't retried yet) — amber
 *   3. flushing/in-flight — pulsing blue spinner
 *   4. pending (queued but not yet attempted) — neutral spinner
 *   5. all delivered (or empty) — green check
 *
 * Click target is left to the parent (the bar wraps it in a Popover).
 */
export interface TrackerBarSyncPipProps {
  state: EventQueueState;
  className?: string;
}

export function TrackerBarSyncPip(props: TrackerBarSyncPipProps) {
  const { state } = props;
  const { stats, isFlushing, isOnline } = state;
  const visual = pickVisual({
    failed: stats.failed,
    pending: stats.pending,
    inFlight: stats.inFlight,
    isFlushing,
    isOnline,
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-[11px] font-medium tabular-nums",
            visual.className,
            props.className,
          )}
        >
          <visual.icon className={cn("size-3.5", visual.iconClassName)} />
          <span>{visual.label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{visual.tooltip}</TooltipContent>
    </Tooltip>
  );
}

interface VisualSpec {
  className: string;
  iconClassName?: string;
  icon: typeof CheckCircle2;
  label: string;
  tooltip: string;
}

function pickVisual(args: {
  failed: number;
  pending: number;
  inFlight: number;
  isFlushing: boolean;
  isOnline: boolean;
}): VisualSpec {
  const { failed, pending, inFlight, isFlushing, isOnline } = args;
  if (failed > 0) {
    return {
      className: "border-red-200 bg-red-50 text-red-700",
      icon: Triangle,
      label: `${failed} failed`,
      tooltip: `${failed} event(s) failed. Open the pending panel to resolve.`,
    };
  }
  if (!isOnline && pending + inFlight > 0) {
    return {
      className: "border-amber-200 bg-amber-50 text-amber-700",
      icon: CloudOff,
      label: `${pending + inFlight} offline`,
      tooltip: `${pending + inFlight} event(s) queued — waiting for connection.`,
    };
  }
  if (isFlushing || inFlight > 0) {
    return {
      className: "border-sky-200 bg-sky-50 text-sky-700",
      iconClassName: "animate-spin",
      icon: Loader2,
      label: pending + inFlight > 0 ? `${pending + inFlight} syncing` : "syncing",
      tooltip: "Sending events to the server…",
    };
  }
  if (pending > 0) {
    return {
      className: "border-slate-200 bg-slate-50 text-slate-700",
      iconClassName: "animate-spin",
      icon: Loader2,
      label: `${pending} queued`,
      tooltip: `${pending} event(s) waiting to be sent.`,
    };
  }
  return {
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
    label: "synced",
    tooltip: "All events have been delivered.",
  };
}
