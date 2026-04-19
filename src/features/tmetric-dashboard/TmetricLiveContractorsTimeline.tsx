"use client";

import { fromAbsolute, getLocalTimeZone } from "@internationalized/date";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator.tsx";
import {
  composeRangeLayersToPaintSegments,
  InfiniteTimeline,
  minuteRangesFromViewportShadow,
  nightWeekendViewportShadowsForShadingState,
  TIMELINE_RANGE_LAYER_PRIORITY,
  useSyncTimelineAtoms,
  useTimelineState,
  useTimelineRangeShadingFromPreference,
  type TimelineItem,
  type TimelineRangePaintLayer,
  type TimelineTimeRangeShadow,
} from "@/platform/passionware-timeline/passionware-timeline.tsx";
import {
  ITEM_COLORS,
  SIDEBAR_WIDTH,
  SUB_ROW_HEIGHT,
  zonedDateTimeToMinutes,
} from "@/platform/passionware-timeline/passionware-timeline-core.ts";
import { unionMinuteRanges } from "@/platform/passionware-timeline/timeline-minute-range-set.ts";
import type { Lane } from "@/platform/passionware-timeline/timeline-lane-tree.ts";
import type { VisibleTimelineLaneRow } from "@/platform/passionware-timeline/timeline-lane-tree.ts";
import type {
  TmetricLiveContractorRow,
  TmetricLiveContractorsPanelData,
} from "@/services/front/TmetricDashboardService/TmetricDashboardService";
import type { DefaultTimelineItemProps } from "@/platform/passionware-timeline/timeline-default-item.tsx";
import type { PreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { cn } from "@/lib/utils";
import { getInitials } from "@/platform/lang/getInitials.ts";
import { useIsMobile } from "@/platform/react/use-mobile.tsx";
import { Circle, Copy, List } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
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

function formatRoundedHalfHoursAgo(diffMs: number): string {
  const safeMs = Number.isFinite(diffMs) ? Math.max(0, diffMs) : 0;
  const rawHours = safeMs / 3_600_000;
  const roundedHalf = Math.round(rawHours * 2) / 2;
  if (roundedHalf <= 0) return "0h";
  if (Number.isInteger(roundedHalf)) return `${roundedHalf}h`;
  return `${roundedHalf.toFixed(1)}h`;
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

function buildBarSummaryText(item: TimelineItem<TmetricLiveBarData>): string {
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
        <p className="break-words text-xs leading-snug text-foreground">
          {value}
        </p>
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
        <p className="font-medium leading-tight text-foreground">
          {d.contractorName}
        </p>
        <p className="text-[11px] leading-snug text-muted-foreground">
          {d.clientLine}
        </p>
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

function ContractorLaneDotLabel({
  row,
  clientLine,
  laneDotClass,
  panelFetchedMs,
}: {
  row: TmetricLiveContractorRow;
  clientLine: string;
  laneDotClass: string;
  panelFetchedMs: number;
}) {
  const initials = contractorLaneInitials(row.fullName);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Show ${row.fullName} details`}
          className={cn(
            "absolute inset-0 z-10 flex items-center justify-center rounded-sm",
            "outline-none transition-colors hover:bg-muted/40",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          )}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full",
              "text-[11px] font-semibold leading-none tracking-tight",
              "text-primary-foreground shadow-sm ring-1 ring-black/10 ring-inset dark:ring-white/15",
              laneDotClass,
            )}
            aria-hidden
          >
            {initials}
          </span>
          <span className="sr-only">{row.fullName}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={6}
        className={cn(
          "w-[min(20rem,calc(100vw-2rem))] p-3",
          "max-h-[var(--radix-popover-content-available-height)] overflow-y-auto",
        )}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <ContractorLaneLabel
          row={row}
          clientLine={clientLine}
          laneDotClass={laneDotClass}
          panelFetchedMs={panelFetchedMs}
        />
      </PopoverContent>
    </Popover>
  );
}

function ContractorLaneLabel({
  row,
  clientLine,
  laneDotClass,
  panelFetchedMs,
}: {
  row: TmetricLiveContractorRow;
  clientLine: string;
  laneDotClass: string;
  panelFetchedMs: number;
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

  const latestEndedAtMs =
    !row.error && !row.currentTimer
      ? row.recentEntries.reduce<number | null>((maxEndMs, entry) => {
          const endMs = readTimeMs(entry.endTime);
          if (endMs == null) return maxEndMs;
          if (maxEndMs == null) return endMs;
          return Math.max(maxEndMs, endMs);
        }, null)
      : null;

  const statusBadge = row.error ? (
    <Badge
      tone="secondary"
      variant="destructive"
      className="shrink-0 scale-90 leading-none"
    >
      Error
    </Badge>
  ) : row.currentTimer ? (
    <Badge
      tone="secondary"
      variant="success"
      className="shrink-0 scale-90 leading-none"
    >
      Active
    </Badge>
  ) : (
    <Badge
      tone="secondary"
      variant="neutral"
      className="shrink-0 scale-90 leading-none"
    >
      {latestEndedAtMs != null
        ? `Ended ${formatRoundedHalfHoursAgo(panelFetchedMs - latestEndedAtMs)} ago`
        : "Ended"}
    </Badge>
  );

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex min-w-0 items-start gap-1.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full ring-1 ring-border/40 ring-inset",
                laneDotClass,
              )}
              aria-hidden
            />
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

function entryBarLabel(
  entry: TmetricLiveContractorRow["recentEntries"][number],
): string {
  return entry.projectName
    ? `${entry.label} · ${entry.projectName}`
    : entry.label;
}

const tmetricBarDetailSheetClass = cn(
  "flex w-full flex-col gap-0 overflow-hidden rounded-t-2xl border-0 p-0 shadow-xl",
  "max-h-[min(92dvh,720px)] pb-[env(safe-area-inset-bottom,0px)] pt-10",
  "[&>button]:right-3 [&>button]:top-3",
);

function TmetricReadOnlyBar(
  props: DefaultTimelineItemProps<TmetricLiveBarData>,
) {
  const { item, left, width } = props;
  const isMobile = useIsMobile();

  const trigger = (
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
  );

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="bottom"
          className={tmetricBarDetailSheetClass}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Time entry details</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <TmetricBarPopoverBody item={item} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
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
  preferenceService: PreferenceService;
  /** When true, timeline grows to fill a flex parent (e.g. full-screen mobile sheet). */
  timelineFillViewport?: boolean;
}

const MIN_TIMELINE_TRACKS_PX = 120;
/** Lane column width in dots mode: fits initials avatar + padding. */
const LANE_LEGEND_DOTS_WIDTH_PX = 52;

function contractorLaneInitials(fullName: string): string {
  const fromLatin = getInitials(fullName);
  if (fromLatin.length > 0) {
    return fromLatin.slice(0, 2);
  }
  const trimmed = fullName.trim();
  const first = trimmed.match(/\p{L}/u)?.[0];
  return first ? first.toLocaleUpperCase() : "?";
}

export function TmetricLiveContractorsTimeline({
  panel,
  clientNameFn,
  preferenceService,
  timelineFillViewport = false,
}: TmetricLiveContractorsTimelineProps) {
  const timeZone = getLocalTimeZone();
  const panelFetchedMs = readTimeMs(panel.fetchedAt) ?? Date.now();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const laneLegendModeDesktop =
    preferenceService.useTmetricLiveContractorsLaneLegendMode();
  const laneLegendModeCompact =
    preferenceService.useTmetricLiveContractorsLaneLegendModeCompact();
  const laneLegendMode = timelineFillViewport
    ? laneLegendModeCompact
    : laneLegendModeDesktop;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (typeof w === "number" && Number.isFinite(w)) {
        setContainerWidth(Math.round(w));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const laneSidebarWidthPx = useMemo(() => {
    if (laneLegendMode === "dots") {
      return LANE_LEGEND_DOTS_WIDTH_PX;
    }
    const fullMax = SIDEBAR_WIDTH * 2;
    const minFullSidebar = 180;
    if (containerWidth <= 0) {
      return Math.min(fullMax, 280);
    }
    const maxSidebar = Math.max(
      minFullSidebar,
      containerWidth - MIN_TIMELINE_TRACKS_PX,
    );
    return Math.min(fullMax, maxSidebar);
  }, [containerWidth, laneLegendMode]);

  const { rangeShadingState, onRangeShadingStateChange } =
    useTimelineRangeShadingFromPreference(
      preferenceService,
      "timeline-range-shading:tmetric-live-contractors",
      { night: true, weekend: true },
    );

  const { lanes, items } = useMemo(() => {
    const lanesOut: Lane<TmetricLiveLaneMeta>[] = [];
    const itemsOut: TimelineItem<TmetricLiveBarData>[] = [];
    const fetchedMs = readTimeMs(panel.fetchedAt) ?? Date.now();

    panel.rows.forEach((row, rowIndex) => {
      const laneId = String(row.contractorId);
      const color = ITEM_COLORS[rowIndex % ITEM_COLORS.length];
      const clientLine = row.clientIds
        .map((id) => clientNameFn(id))
        .join(" · ");

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

  const clampClass = "bg-zinc-500/20";
  const nightClass = "bg-zinc-900/5";
  const weekendClass = "bg-sky-800/15";

  const nightViewportShadowsOnly = useMemo(
    () =>
      nightWeekendViewportShadowsForShadingState(
        { night: rangeShadingState.night, weekend: false },
        { night: nightClass, weekend: weekendClass },
      ),
    [rangeShadingState.night, nightClass, weekendClass],
  );

  const weekendViewportShadowsOnly = useMemo(
    () =>
      nightWeekendViewportShadowsForShadingState(
        { night: false, weekend: rangeShadingState.weekend },
        { night: nightClass, weekend: weekendClass },
      ),
    [rangeShadingState.weekend, nightClass, weekendClass],
  );

  /** Raw producers + {@link composeRangeLayersToPaintSegments}: clamp (24h) > weekend > night. */
  const timeRangeShadows = useMemo((): TimelineTimeRangeShadow[] => {
    const nowMs = readTimeMs(panel.fetchedAt) ?? Date.now();
    const last24hStartMs = nowMs - 24 * 60 * 60 * 1000;
    return [
      {
        kind: "viewport" as const,
        resolve: (ctx) => {
          const lo = Math.min(ctx.visibleStartMinutes, ctx.visibleEndMinutes);
          const hi = Math.max(ctx.visibleStartMinutes, ctx.visibleEndMinutes);

          const nowMinutes = zonedDateTimeToMinutes(
            fromAbsolute(nowMs, ctx.timeZone),
            ctx.baseDateZoned,
          );
          const last24StartMinutes = zonedDateTimeToMinutes(
            fromAbsolute(last24hStartMs, ctx.timeZone),
            ctx.baseDateZoned,
          );

          const clampRanges = unionMinuteRanges([
            { start: lo, end: Math.min(last24StartMinutes, hi) },
            { start: Math.max(nowMinutes, lo), end: hi },
          ]);
          const nightRaw = minuteRangesFromViewportShadow(
            nightViewportShadowsOnly[0],
            ctx,
          );
          const weekendRaw = minuteRangesFromViewportShadow(
            weekendViewportShadowsOnly[0],
            ctx,
          );

          const layers: TimelineRangePaintLayer[] = [
            {
              id: "clamp",
              priority: TIMELINE_RANGE_LAYER_PRIORITY.clamp,
              className: clampClass,
              ranges: clampRanges,
            },
            {
              id: "weekend",
              priority: TIMELINE_RANGE_LAYER_PRIORITY.weekend,
              className: weekendClass,
              ranges: weekendRaw,
            },
            {
              id: "night",
              priority: TIMELINE_RANGE_LAYER_PRIORITY.night,
              className: nightClass,
              ranges: nightRaw,
            },
          ];
          return composeRangeLayersToPaintSegments(layers);
        },
      },
    ];
  }, [
    panel.fetchedAt,
    timeZone,
    nightViewportShadowsOnly,
    weekendViewportShadowsOnly,
    clampClass,
    nightClass,
    weekendClass,
  ]);

  const timelineState = useTimelineState<
    TmetricLiveBarData,
    TmetricLiveLaneMeta
  >({
    defaultSnapOption: "15min",
  });

  useSyncTimelineAtoms(timelineState, {
    items,
    lanes,
    timeZone,
    expandedLaneIds: null,
    laneSidebarWidthPx,
  });

  const renderLaneLabel = (
    lane: VisibleTimelineLaneRow<TmetricLiveLaneMeta>,
  ) => {
    const meta = lane.meta;
    if (!meta) {
      return (
        <span className="truncate text-xs text-muted-foreground">
          {lane.name}
        </span>
      );
    }
    if (laneLegendMode === "dots") {
      return (
        <ContractorLaneDotLabel
          row={meta.row}
          clientLine={meta.clientLine}
          laneDotClass={lane.color}
          panelFetchedMs={panelFetchedMs}
        />
      );
    }
    return (
      <ContractorLaneLabel
        row={meta.row}
        clientLine={meta.clientLine}
        laneDotClass={lane.color}
        panelFetchedMs={panelFetchedMs}
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
    <div
      ref={containerRef}
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-lg border border-border/60 bg-background",
        timelineFillViewport
          ? "min-h-0 flex-1"
          : "h-[min(65vh,29rem)] min-h-[16rem]",
      )}
    >
      <div className="flex shrink-0 items-center justify-end gap-1 border-b border-border/50 bg-muted/15 px-2 py-1">
        <span className="mr-auto hidden text-[10px] text-muted-foreground sm:inline">
          Contractor lane
        </span>
        <Button
          type="button"
          variant={laneLegendMode === "full" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 gap-1 px-2 text-[10px]"
          aria-pressed={laneLegendMode === "full"}
          aria-label="Show full lane labels"
          onClick={() =>
            void (timelineFillViewport
              ? preferenceService.setTmetricLiveContractorsLaneLegendModeCompact(
                  "full",
                )
              : preferenceService.setTmetricLiveContractorsLaneLegendMode(
                  "full",
                ))
          }
        >
          <List className="size-3.5 shrink-0 opacity-80" />
          Labels
        </Button>
        <Button
          type="button"
          variant={laneLegendMode === "dots" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 gap-1 px-2 text-[10px]"
          aria-pressed={laneLegendMode === "dots"}
          aria-label="Show colored dots only in lane column"
          onClick={() =>
            void (timelineFillViewport
              ? preferenceService.setTmetricLiveContractorsLaneLegendModeCompact(
                  "dots",
                )
              : preferenceService.setTmetricLiveContractorsLaneLegendMode(
                  "dots",
                ))
          }
        >
          <Circle className="size-3.5 shrink-0 opacity-80" />
          Dots
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
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
          rangeShadingState={rangeShadingState}
          onRangeShadingStateChange={onRangeShadingStateChange}
          renderItem={(itemProps) => <TmetricReadOnlyBar {...itemProps} />}
        />
      </div>
    </div>
  );
}
