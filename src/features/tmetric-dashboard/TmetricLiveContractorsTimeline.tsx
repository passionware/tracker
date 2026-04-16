"use client";

import { fromAbsolute, getLocalTimeZone } from "@internationalized/date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  InfiniteTimeline,
  useSyncTimelineAtoms,
  useTimelineState,
  type TimelineItem,
  type TimelineTimeRangeShadow,
} from "@/platform/passionware-timeline/passionware-timeline.tsx";
import {
  ITEM_COLORS,
  SIDEBAR_WIDTH,
  SUB_ROW_HEIGHT,
} from "@/platform/passionware-timeline/passionware-timeline-core.ts";
import type { Lane } from "@/platform/passionware-timeline/timeline-lane-tree.ts";
import type { VisibleTimelineLaneRow } from "@/platform/passionware-timeline/timeline-lane-tree.ts";
import type {
  TmetricLiveContractorRow,
  TmetricLiveContractorsPanelData,
} from "@/services/front/TmetricDashboardService/TmetricDashboardService";
import type { DefaultTimelineItemProps } from "@/platform/passionware-timeline/timeline-default-item.tsx";
import { cn } from "@/lib/utils";
import { Copy } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

export type TmetricLiveBarData = {
  kind: "timer" | "entry";
  timeZone: string;
  contractorName: string;
  clientLine: string;
  /** Raw task / description (without project suffix). */
  taskLabel: string;
  projectName?: string;
  rangeStartMs: number;
  rangeEndMs: number;
  entryId?: number;
  /** Completed entry: hours overlapping last 24h from API. */
  entryDurationHours?: number;
};

export type TmetricLiveLaneMeta = {
  row: TmetricLiveContractorRow;
  clientLine: string;
};

function formatHours(h: number): string {
  if (h < 0.05) return "0 h";
  if (h < 10) return `${h.toFixed(1)} h`;
  return `${Math.round(h)} h`;
}

/** Safe epoch ms for API / cache-restored values; avoids `fromAbsolute(NaN)` → invalid `Date` in the timeline. */
function readTimeMs(
  value: Date | string | number | undefined | null,
): number | null {
  if (value == null) return null;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch {
    toast.error("Could not copy");
  }
}

function formatInstantInZone(ms: number, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString();
  }
}

function buildBarSummaryText(
  item: TimelineItem<TmetricLiveBarData>,
): string {
  const d = item.data;
  const lines: string[] = [
    d.kind === "timer" ? "Active timer" : "TMetric time entry",
    `Contractor: ${d.contractorName}`,
    `Clients: ${d.clientLine}`,
    `Task: ${d.taskLabel}`,
  ];
  if (d.projectName) lines.push(`Project: ${d.projectName}`);
  lines.push(
    `Start: ${formatInstantInZone(d.rangeStartMs, d.timeZone)}`,
    `End: ${formatInstantInZone(d.rangeEndMs, d.timeZone)}`,
    `Span: ${formatHours((d.rangeEndMs - d.rangeStartMs) / 3_600_000)}`,
  );
  if (d.kind === "entry" && d.entryId != null) {
    lines.push(`Entry ID: ${d.entryId}`);
  }
  return lines.join("\n");
}

function CopyableField({
  label,
  value,
  copyAriaLabel,
}: {
  label: string;
  value: string;
  copyAriaLabel: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <p className="break-words text-xs leading-snug text-foreground">{value}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={copyAriaLabel}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void copyToClipboard(value);
        }}
      >
        <Copy className="size-3.5" />
      </Button>
    </div>
  );
}

function TmetricBarPopoverBody({
  item,
}: {
  item: TimelineItem<TmetricLiveBarData>;
}) {
  const d = item.data;
  const spanH = (d.rangeEndMs - d.rangeStartMs) / 3_600_000;
  const summary = buildBarSummaryText(item);

  return (
    <div className="space-y-3" onMouseDown={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          tone="secondary"
          variant={d.kind === "timer" ? "success" : "neutral"}
          className="shrink-0 text-[10px] leading-none"
        >
          {d.kind === "timer" ? "Active timer" : "Completed entry"}
        </Badge>
        {d.kind === "entry" && d.entryId != null ? (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            Entry #{d.entryId}
          </span>
        ) : null}
      </div>

      <div className="space-y-1 text-xs">
        <p className="font-medium leading-tight text-foreground">{d.contractorName}</p>
        <p className="text-[11px] leading-snug text-muted-foreground">{d.clientLine}</p>
      </div>

      <Separator />

      <div className="space-y-3">
        <CopyableField
          label="Task"
          value={d.taskLabel}
          copyAriaLabel="Copy task name"
        />
        {d.projectName ? (
          <CopyableField
            label="Project"
            value={d.projectName}
            copyAriaLabel="Copy project name"
          />
        ) : null}
        <CopyableField
          label="Timeline label"
          value={item.label}
          copyAriaLabel="Copy label as on timeline"
        />
      </div>

      <Separator />

      <dl className="space-y-2 text-xs text-muted-foreground">
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/90">
            Start
          </dt>
          <dd className="mt-0.5 tabular-nums text-foreground">
            {formatInstantInZone(d.rangeStartMs, d.timeZone)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/90">
            End
          </dt>
          <dd className="mt-0.5 tabular-nums text-foreground">
            {formatInstantInZone(d.rangeEndMs, d.timeZone)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/90">
            Duration
          </dt>
          <dd className="mt-0.5 font-medium text-foreground">
            {formatHours(spanH)}
            {d.kind === "entry" && d.entryDurationHours != null ? (
              <span className="ml-1.5 font-normal text-muted-foreground">
                ({formatHours(d.entryDurationHours)} in last 24h window)
              </span>
            ) : null}
          </dd>
        </div>
      </dl>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-8 w-full gap-1.5 text-xs"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void copyToClipboard(summary);
        }}
      >
        <Copy className="size-3.5 opacity-80" />
        Copy all details
      </Button>
    </div>
  );
}

function ContractorLaneLabel({
  row,
  clientLine,
  laneDotClass,
}: {
  row: TmetricLiveContractorRow;
  clientLine: string;
  laneDotClass: string;
}) {
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
    <Badge tone="secondary" variant="destructive" className="shrink-0 scale-90 leading-none">
      Error
    </Badge>
  ) : row.currentTimer ? (
    <Badge tone="secondary" variant="success" className="shrink-0 scale-90 leading-none">
      Active
    </Badge>
  ) : (
    <Badge tone="secondary" variant="neutral" className="shrink-0 scale-90 leading-none">
      Ended
    </Badge>
  );

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex min-w-0 items-start gap-1.5">
        <span
          className={cn(
            "mt-0.5 size-2 shrink-0 rounded-full ring-1 ring-border/40 ring-inset",
            laneDotClass,
          )}
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-1">
            <span className="min-w-0 truncate text-xs font-semibold leading-tight tracking-tight">
              {row.fullName}
            </span>
            {statusBadge}
          </div>
          {!row.error ? (
            rootTaskLabel ? (
              <span
                className="block min-w-0 truncate text-[10px] leading-snug text-muted-foreground"
                title={rootTaskLabel}
              >
                {rootTaskLabel}
              </span>
            ) : (
              <span className="text-[10px] italic text-muted-foreground/80">
                No tasks in last 24h
              </span>
            )
          ) : (
            <span className="text-[10px] leading-snug text-destructive line-clamp-2">
              {row.error}
            </span>
          )}
          <div className="flex min-w-0 items-baseline gap-1 text-[10px] leading-snug text-muted-foreground">
            <span className="min-w-0 truncate" title={clientLine}>
              {clientLine}
            </span>
            <span className="shrink-0 text-muted-foreground/40">·</span>
            <span className="shrink-0 tabular-nums font-medium text-foreground/80">
              {formatHours(row.last24hHours)}
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          aria-label={primaryCopyAriaLabel}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void copyToClipboard(primaryCopyText);
          }}
        >
          <Copy className="size-3" />
        </Button>
      </div>
    </div>
  );
}

function entryBarLabel(entry: TmetricLiveContractorRow["recentEntries"][number]): string {
  return entry.projectName
    ? `${entry.label} · ${entry.projectName}`
    : entry.label;
}

function TmetricReadOnlyBar(
  props: DefaultTimelineItemProps<TmetricLiveBarData>,
) {
  const { item, left, width } = props;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          data-timeline-item
          role="button"
          tabIndex={0}
          className={cn(
            "pointer-events-auto absolute flex cursor-pointer items-center overflow-hidden rounded-md border border-black/10 px-1 text-left text-primary-foreground shadow-sm outline-none ring-offset-background hover:brightness-[1.03] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            item.color ?? "bg-primary",
          )}
          style={{
            left,
            width: Math.max(width, 6),
            top: 8 + (item.row ?? 0) * SUB_ROW_HEIGHT,
            height: SUB_ROW_HEIGHT - 4,
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <span className="min-w-0 flex-1 truncate px-0.5 text-[10px] font-medium leading-tight">
            {item.label}
          </span>
        </div>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={6}
        className="w-[min(22rem,calc(100vw-2rem))] max-w-[min(22rem,calc(100vw-2rem))] p-3"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <TmetricBarPopoverBody item={item} />
      </PopoverContent>
    </Popover>
  );
}

export interface TmetricLiveContractorsTimelineProps {
  panel: TmetricLiveContractorsPanelData;
  clientNameFn: (clientId: number) => string;
}

export function TmetricLiveContractorsTimeline({
  panel,
  clientNameFn,
}: TmetricLiveContractorsTimelineProps) {
  const timeZone = getLocalTimeZone();

  const { lanes, items } = useMemo(() => {
    const lanesOut: Lane<TmetricLiveLaneMeta>[] = [];
    const itemsOut: TimelineItem<TmetricLiveBarData>[] = [];
    const fetchedMs = readTimeMs(panel.fetchedAt) ?? Date.now();

    panel.rows.forEach((row, rowIndex) => {
      const laneId = String(row.contractorId);
      const color = ITEM_COLORS[rowIndex % ITEM_COLORS.length];
      const clientLine = row.clientIds.map((id) => clientNameFn(id)).join(" · ");

      lanesOut.push({
        id: laneId,
        name: row.fullName,
        color,
        minTrackHeightPx: 88,
        meta: { row, clientLine },
      });

      if (row.error) {
        return;
      }

      if (row.currentTimer) {
        const startRaw = readTimeMs(row.currentTimer.startedAt);
        if (startRaw != null) {
          const endMs = fetchedMs;
          const startMs = startRaw > endMs ? endMs - 60_000 : startRaw;
          itemsOut.push({
            id: `tm-live-${row.contractorId}-timer`,
            laneId,
            start: fromAbsolute(startMs, timeZone),
            end: fromAbsolute(endMs, timeZone),
            label: row.currentTimer.projectName
              ? `${row.currentTimer.label} · ${row.currentTimer.projectName}`
              : row.currentTimer.label,
            color,
            data: {
              kind: "timer",
              timeZone,
              contractorName: row.fullName,
              clientLine,
              taskLabel: row.currentTimer.label,
              projectName: row.currentTimer.projectName,
              rangeStartMs: startMs,
              rangeEndMs: endMs,
            },
          });
        }
      }

      for (const entry of row.recentEntries) {
        const startMs = readTimeMs(entry.startTime);
        const endMs = readTimeMs(entry.endTime);
        if (startMs == null || endMs == null) continue;
        const lo = Math.min(startMs, endMs);
        const hi = Math.max(startMs, endMs);
        itemsOut.push({
          id: `tm-live-${row.contractorId}-e-${entry.id}`,
          laneId,
          start: fromAbsolute(lo, timeZone),
          end: fromAbsolute(hi, timeZone),
          label: entryBarLabel(entry),
          color,
          data: {
            kind: "entry",
            timeZone,
            contractorName: row.fullName,
            clientLine,
            taskLabel: entry.label,
            projectName: entry.projectName,
            rangeStartMs: lo,
            rangeEndMs: hi,
            entryId: entry.id,
            entryDurationHours: entry.durationHours,
          },
        });
      }
    });

    return { lanes: lanesOut, items: itemsOut };
  }, [panel.rows, panel.fetchedAt, clientNameFn, timeZone]);

  const viewportRange = useMemo(() => {
    const endMs = readTimeMs(panel.fetchedAt) ?? Date.now();
    const startMs = endMs - 24 * 60 * 60 * 1000;
    return {
      start: fromAbsolute(startMs, timeZone),
      end: fromAbsolute(endMs, timeZone),
    };
  }, [panel.fetchedAt, timeZone]);

  /** Dim outside the last-24h “live” window: older than 24h, and future from panel snapshot time. */
  const timeRangeShadows = useMemo((): TimelineTimeRangeShadow[] => {
    const nowMs = readTimeMs(panel.fetchedAt) ?? Date.now();
    const last24hStartMs = nowMs - 24 * 60 * 60 * 1000;
    const grey = "bg-zinc-500/20";
    return [
      { start: null, end: fromAbsolute(last24hStartMs, timeZone), className: grey },
      { start: fromAbsolute(nowMs, timeZone), end: null, className: grey },
    ];
  }, [panel.fetchedAt, timeZone]);

  const timelineState = useTimelineState<TmetricLiveBarData, TmetricLiveLaneMeta>({
    defaultSnapOption: "15min",
  });

  useSyncTimelineAtoms(timelineState, {
    items,
    lanes,
    timeZone,
    expandedLaneIds: null,
    laneSidebarWidthPx: SIDEBAR_WIDTH * 2,
  });

  const renderLaneLabel = (lane: VisibleTimelineLaneRow<TmetricLiveLaneMeta>) => {
    const meta = lane.meta;
    if (!meta) {
      return (
        <span className="truncate text-xs text-muted-foreground">{lane.name}</span>
      );
    }
    return (
      <ContractorLaneLabel
        row={meta.row}
        clientLine={meta.clientLine}
        laneDotClass={lane.color}
      />
    );
  };

  if (lanes.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
        No integrated contractors in scope.
      </p>
    );
  }

  return (
    <div className="h-[min(65vh,26rem)] min-h-[16rem] w-full overflow-hidden rounded-lg border border-border/60 bg-background">
      <InfiniteTimeline<TmetricLiveBarData, TmetricLiveLaneMeta>
        state={timelineState}
        embedded
        hideLaneControls
        renderLaneLabel={renderLaneLabel}
        interactionOptions={{
          viewportRange,
          itemActivateTrigger: "click",
        }}
        timeRangeShadows={timeRangeShadows}
        renderItem={(itemProps) => <TmetricReadOnlyBar {...itemProps} />}
      />
    </div>
  );
}
