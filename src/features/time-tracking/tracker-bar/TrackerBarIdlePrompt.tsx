import { Button } from "@/components/ui/button.tsx";
import type { WithFrontServices } from "@/core/frontServices.ts";
import {
  buildContractorEnvelope,
  buildEntryStoppedPayload,
  newUuid,
} from "@/features/time-tracking/_common/trackerCommands.ts";
import { formatElapsedSeconds } from "@/features/time-tracking/_common/useElapsedSeconds.ts";
import type { ContractorStreamState, EntryState } from "@/api/time-event/aggregates";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * "Still working?" prompt rendered inside the running TrackerBar when the
 * IdleDetectionService reports the user has been inactive past the
 * configured threshold.
 *
 * Three actions:
 *   1. **Yes, keep tracking** — markActive() resets the detector. The
 *      timer continues; nothing is sent to the server.
 *   2. **Stop at last activity** — emits an `EntryStopped` with
 *      `stoppedAt = lastActivityAt`. Honest accounting: the timer is
 *      retroactively stopped at the moment the user stepped away,
 *      preventing accidentally billed afk minutes.
 *   3. **Stop now** — escape hatch when the user is sitting back down
 *      and wants to count the idle time as work (e.g. they were on a
 *      phone call). Behaves as the regular Stop button.
 *
 * The prompt does NOT auto-dismiss after a timeout — leaving the bar in
 * a "you're idle" state when the user steps away for hours is preferable
 * to silently logging hours of phantom work. Activity events naturally
 * clear it via the markActive flow.
 */
export interface TrackerBarIdlePromptProps extends WithFrontServices {
  contractorId: number;
  entry: EntryState;
  serverState: ContractorStreamState;
  secondsSinceActivity: number;
  lastActivityAt: Date;
}

export function TrackerBarIdlePrompt(props: TrackerBarIdlePromptProps) {
  const [busy, setBusy] = useState<"keep" | "stop-last" | "stop-now" | null>(
    null,
  );

  const stopAt = async (stoppedAt: string, label: string) => {
    const envelope = buildContractorEnvelope({
      contractorId: props.contractorId,
      correlationId: newUuid(),
    });
    const payload = buildEntryStoppedPayload(props.entry.entryId, stoppedAt);
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
    toast.success(label);
  };

  const handleKeep = () => {
    props.services.idleDetectionService.markActive();
  };

  const handleStopAtLastActivity = async () => {
    setBusy("stop-last");
    try {
      await stopAt(
        props.lastActivityAt.toISOString(),
        `Stopped retroactively at ${formatRelative(props.lastActivityAt)}`,
      );
    } finally {
      setBusy(null);
      props.services.idleDetectionService.markActive();
    }
  };

  const handleStopNow = async () => {
    setBusy("stop-now");
    try {
      await stopAt(new Date().toISOString(), "Timer stopped");
    } finally {
      setBusy(null);
      props.services.idleDetectionService.markActive();
    }
  };

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-amber-900">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium">Still working?</span>
          <span className="text-[11px] opacity-80">
            No activity for {formatElapsedSeconds(props.secondsSinceActivity)}.
          </span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleKeep}
          disabled={busy !== null}
        >
          Yes, keep tracking
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={handleStopAtLastActivity}
          disabled={busy !== null}
        >
          {busy === "stop-last" ? "Stopping…" : "Stop at last activity"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={handleStopNow}
          disabled={busy !== null}
        >
          {busy === "stop-now" ? "Stopping…" : "Stop now"}
        </Button>
      </div>
    </div>
  );
}

function formatRelative(d: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
}
