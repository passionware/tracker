import { Button } from "@/components/ui/button.tsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet.tsx";
import type { WithFrontServices } from "@/core/frontServices.ts";
import { useEventQueueState } from "@/features/time-tracking/_common/useEventQueueState.ts";
import { TrackerBarSyncPip } from "@/features/time-tracking/tracker-bar/TrackerBarSyncPip.tsx";
import { cn } from "@/lib/utils.ts";
import type { QueuedEvent } from "@/api/time-event-queue/queued-event.api.ts";
import type {
  ContractorEventEnvelope,
  ContractorEventPayload,
} from "@/api/time-event/time-event.api.ts";
import { formatDistanceToNow } from "date-fns";
import { RotateCw, Trash2 } from "lucide-react";

/**
 * Detail panel that the sync pip opens. Shows every event currently held
 * by {@link EventQueueService} along with its lifecycle, last error, and
 * a "drop" affordance for terminal-state rows (delivered / failed).
 *
 * Pending and in-flight rows are intentionally non-droppable — letting the
 * user yank an in-flight event would create a "the worker has it but the
 * UI thinks it didn't" bug; instead we show a spinner and let the queue's
 * backoff loop sort it out.
 */
export function TrackerBarPendingSheet(props: WithFrontServices) {
  const queueState = useEventQueueState(props);
  const events = queueState.events;
  const handleFlush = () => {
    void props.services.eventQueueService.flushNow();
  };
  const handleDrop = (seq: number) => {
    void props.services.eventQueueService.drop(seq);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="contents"
          aria-label="Open pending sync panel"
        >
          <TrackerBarSyncPip state={queueState} />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[28rem] sm:max-w-none">
        <SheetHeader>
          <SheetTitle>Event queue</SheetTitle>
          <SheetDescription>
            Time-tracking events waiting to be delivered to the server.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {events.length} total · {queueState.stats.pending} pending ·
            {" "}
            {queueState.stats.failed} failed
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={handleFlush}
            disabled={queueState.isFlushing}
          >
            <RotateCw
              className={cn("size-3.5", queueState.isFlushing && "animate-spin")}
            />
            Flush now
          </Button>
        </div>
        <ul className="mt-3 flex flex-col gap-2 overflow-y-auto pr-1">
          {events.length === 0 ? (
            <li className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              All events delivered. Nothing waiting.
            </li>
          ) : (
            events.map((row) => (
              <PendingRow key={row.seq} row={row} onDrop={handleDrop} />
            ))
          )}
        </ul>
      </SheetContent>
    </Sheet>
  );
}

function PendingRow(props: {
  row: QueuedEvent;
  onDrop: (seq: number) => void;
}) {
  const { row } = props;
  const visual = visualForStatus(row.status);
  const isContractor = row.streamKind === "contractor";
  const payload = row.payload as ContractorEventPayload;
  const env = row.envelope as ContractorEventEnvelope;
  const droppable =
    row.status === "delivered" ||
    row.status === "failed_validation" ||
    row.status === "failed_transient";
  return (
    <li
      className={cn(
        "rounded-md border p-3 text-xs",
        visual.className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 truncate">
          <span className="inline-flex h-5 items-center rounded-full border border-current/30 bg-background px-1.5 text-[10px] font-medium uppercase tracking-wide">
            {visual.label}
          </span>
          <span className="font-medium truncate">{payload.type}</span>
        </div>
        {droppable ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-muted-foreground"
            onClick={() => props.onDrop(row.seq)}
            aria-label="Drop event"
          >
            <Trash2 className="size-3.5" />
          </Button>
        ) : null}
      </div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
        <dt>Stream</dt>
        <dd className="truncate">
          {isContractor
            ? `contractor:${(env as ContractorEventEnvelope).contractorId}`
            : row.streamKey}
        </dd>
        <dt>Enqueued</dt>
        <dd>
          {formatDistanceToNow(row.enqueuedAt, { addSuffix: true })}
        </dd>
        {row.attempts > 0 ? (
          <>
            <dt>Attempts</dt>
            <dd>{row.attempts}</dd>
          </>
        ) : null}
        {row.lastError ? (
          <>
            <dt>Error</dt>
            <dd className="text-red-700 break-words">
              {row.lastError.message}
            </dd>
          </>
        ) : null}
      </dl>
    </li>
  );
}

function visualForStatus(status: QueuedEvent["status"]) {
  switch (status) {
    case "pending":
      return { label: "queued", className: "border-slate-200" };
    case "in_flight":
      return { label: "sending", className: "border-sky-200 bg-sky-50/40" };
    case "delivered":
      return { label: "delivered", className: "border-emerald-200 bg-emerald-50/40" };
    case "failed_validation":
      return { label: "rejected", className: "border-red-200 bg-red-50/40" };
    case "failed_transient":
      return { label: "retry", className: "border-amber-200 bg-amber-50/40" };
  }
}
