"use client";

import type { ZonedDateTime } from "@internationalized/date";
import React, {
  useCallback,
  useRef,
  useState,
  useEffect,
  type MouseEvent as ReactMouseEvent,
  type Ref,
} from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  type TimelineItem,
  type TimelineItemInternal,
  type SnapOption,
  SUB_ROW_HEIGHT,
  HEADER_HEIGHT,
  SIDEBAR_WIDTH,
  ITEM_COLORS,
  formatTime,
  formatDate,
  formatMonthDay,
  formatMonthShort,
  formatDrawPreviewRange,
  type DrawingPreviewLabelParams,
  formatMonthYear,
  formatYear,
  formatQuarter,
  formatWeek,
  alignDayMinutesToWeekStart,
  collectDayMarkerMinutesForRange,
  collectMonthStartMinutesForRange,
  collectQuarterStartMinutesForRange,
  collectYearStartMinutesForRange,
  getZonedDayAfterEndMinutes,
  getZonedDayStartMinutes,
  minutesToZonedDateTime,
  timelineZonedNow,
  zonedDateTimeToMinutes,
  timelineItemsTimeOverlap,
  toExternalItem,
  toInternalItem,
} from "./passionware-timeline-core.ts";
import type { VisibleTimelineLaneRow } from "./timeline-lane-tree.ts";
import {
  useTimelineCore,
  type TimelineCoreApi,
  type UseTimelineCoreOptions,
} from "./use-timeline-core.ts";
import { useTimelineLayout } from "./use-timeline-layout.ts";
import {
  useTimelineInteractions,
  type UseTimelineInteractionsOptions,
} from "./use-timeline-interactions.ts";
export { useTimelineCore } from "./use-timeline-core.ts";
export type {
  UseTimelineCoreOptions,
  TimelineCoreApi,
} from "./use-timeline-core.ts";
export { useTimelineLayout } from "./use-timeline-layout.ts";
export type {
  UseTimelineLayoutParams,
  TimelineLayoutApi,
} from "./use-timeline-layout.ts";
export { useTimelineInteractions } from "./use-timeline-interactions.ts";
export type {
  UseTimelineInteractionsOptions,
  UseTimelineInteractionsParams,
} from "./use-timeline-interactions.ts";

export type {
  TimelineItem,
  TimelineTemporal,
  DrawingPreviewLabelParams,
} from "./passionware-timeline-core.ts";
export type {
  CalendarDate,
  CalendarDateTime,
  ZonedDateTime,
} from "@internationalized/date";
export {
  defaultTimelineBaseZoned,
  timelineTemporalToZoned,
  timelineZonedNow,
} from "./passionware-timeline-core.ts";
export type { Lane, VisibleTimelineLaneRow } from "./timeline-lane-tree.ts";

// Default Timeline Item Component
interface DefaultTimelineItemProps<Data = unknown> {
  item: TimelineItem<Data>;
  left: number;
  width: number;
  isSelected: boolean;
  /** Synced list selection; extra emphasis when true. */
  selected: boolean;
  isMinWidth: boolean;
  /** `item` is intentionally loose so render-prop timelines stay assignable across `Data` generics. */
  onMouseDown: (
    e: ReactMouseEvent,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- bivariant item ref for renderItem
    item: TimelineItem<any>,
    type: "move" | "resize-start" | "resize-end",
  ) => void;
  /** Optional — e.g. tooltips; hover ring uses CSS `:hover` on the item. */
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: (
    e: ReactMouseEvent,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    item: TimelineItem<any>,
  ) => void;
  onMouseOver?: () => void;
  ref?: Ref<HTMLDivElement>;
}

export function DefaultTimelineItem({
  item,
  left,
  width,
  isSelected,
  selected = isSelected,
  isMinWidth,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onMouseOver,
  ref,
  ...props
}: DefaultTimelineItemProps<any>) { // eslint-disable-line @typescript-eslint/no-explicit-any -- bivariant item ref for renderItem
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef(false);

  const handleMouseDown = (e: ReactMouseEvent) => {
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    hasDraggedRef.current = false;
    onMouseDown(e, item, "move");

    const handleMove = () => {
      hasDraggedRef.current = true;
    };

    const handleUp = (upEvent: globalThis.MouseEvent) => {
      if (mouseDownPosRef.current && onClick) {
        const deltaX = Math.abs(upEvent.clientX - mouseDownPosRef.current.x);
        const deltaY = Math.abs(upEvent.clientY - mouseDownPosRef.current.y);
        // Only trigger click if mouse moved less than 5px (not a drag)
        if (deltaX < 5 && deltaY < 5 && !hasDraggedRef.current) {
          onClick(e, item);
        }
      }
      mouseDownPosRef.current = null;
      hasDraggedRef.current = false;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  return (
    <div
      ref={ref}
      {...props}
      data-timeline-item
      className={cn(
        "absolute rounded transition-shadow cursor-grab group",
        item.color || "bg-primary",
        isSelected &&
          "ring-2 ring-foreground ring-offset-1 ring-offset-background",
        selected &&
          "z-[1] ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md",
        !isSelected &&
          !selected &&
          "hover:ring-1 hover:ring-foreground/50",
      )}
      style={{
        left,
        width,
        top: 8 + (item.row || 0) * SUB_ROW_HEIGHT,
        height: SUB_ROW_HEIGHT - 4,
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseOver={onMouseOver}
    >
      {/* Resize handle - start */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-foreground/30 rounded-l transition-opacity"
        onMouseDown={(e) => onMouseDown(e, item, "resize-start")}
      />

      {/* Item content */}
      <div
        className={cn(
          "absolute inset-x-2 inset-y-0 flex items-center overflow-hidden",
          isMinWidth && "inset-x-1",
        )}
      >
        <span className="text-xs font-medium text-primary-foreground truncate">
          {item.label}
        </span>
      </div>

      {/* Resize handle - end */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-foreground/30 rounded-r transition-opacity"
        onMouseDown={(e) => onMouseDown(e, item, "resize-end")}
      />
    </div>
  );
}

export type { SnapOption } from "./passionware-timeline-core.ts";

export interface InfiniteTimelineProps<Data = unknown, TLaneMeta = unknown> {
  state: TimelineCoreApi<Data, TLaneMeta>;
  /** Passed to `useTimelineInteractions` inside the timeline (wheel, drag, callbacks). */
  interactionOptions?: UseTimelineInteractionsOptions<Data>;
  renderItem?: (props: {
    item: TimelineItem<Data>;
    left: number;
    width: number;
    isSelected: boolean;
    selected: boolean;
    isMinWidth: boolean;
    onMouseDown: (
      e: ReactMouseEvent,
      item: TimelineItem<Data>,
      type: "move" | "resize-start" | "resize-end",
    ) => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onClick?: (e: ReactMouseEvent, item: TimelineItem<Data>) => void;
  }) => React.ReactNode;
  onItemHover?: (item: TimelineItem<Data>) => void;
  isEventSelected?: (item: TimelineItem<Data>) => boolean;
  /** In-lane draw preview (“ghost”) content. Default: `formatDrawPreviewRange` (plain string). */
  renderDrawingPreviewLabel?: (
    params: DrawingPreviewLabelParams,
    lane: VisibleTimelineLaneRow<TLaneMeta>,
  ) => React.ReactNode;
}

type InfiniteTimelineWithStateProps<
  Data,
  TLaneMeta = unknown,
> = UseTimelineCoreOptions<Data, TLaneMeta> &
  UseTimelineInteractionsOptions<Data> &
  Omit<InfiniteTimelineProps<Data, TLaneMeta>, "state" | "interactionOptions">;

/** Calls `useTimelineCore` and renders `InfiniteTimeline`. Use inside leaf components (e.g. under `rd.map`). */
export function InfiniteTimelineWithState<Data = unknown, TLaneMeta = unknown>({
  items,
  lanes,
  timeZone,
  expandedLaneIds,
  defaultExpandedLaneIds,
  onExpandedLaneIdsChange,
  defaultSnapOption,
  onItemsChange,
  onDrawComplete,
  onItemClick,
  onEventSelect,
  itemActivateTrigger,
  renderItem,
  onItemHover,
  isEventSelected,
  renderDrawingPreviewLabel,
}: InfiniteTimelineWithStateProps<Data, TLaneMeta>) {
  const state = useTimelineCore<Data, TLaneMeta>({
    items,
    lanes,
    timeZone,
    expandedLaneIds,
    defaultExpandedLaneIds,
    onExpandedLaneIdsChange,
    defaultSnapOption,
  });
  return (
    <InfiniteTimeline<Data, TLaneMeta>
      state={state}
      interactionOptions={{
        onItemsChange,
        onDrawComplete,
        onItemClick,
        onEventSelect,
        itemActivateTrigger,
      }}
      renderItem={renderItem}
      onItemHover={onItemHover}
      isEventSelected={isEventSelected}
      renderDrawingPreviewLabel={renderDrawingPreviewLabel}
    />
  );
}

export function InfiniteTimeline<Data = unknown, TLaneMeta = unknown>({
  state,
  interactionOptions = {},
  renderItem,
  onItemHover,
  isEventSelected,
  renderDrawingPreviewLabel,
}: InfiniteTimelineProps<Data, TLaneMeta>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const screenXToContainerX = useCallback((screenX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return screenX;
    return screenX - rect.left;
  }, []);

  const layout = useTimelineLayout<Data, TLaneMeta>({
    mergedItems: state.mergedItems,
    visibleLaneRows: state.visibleLaneRows,
    scrollOffset: state.scrollOffset,
    zoom: state.zoom,
    dragState: state.dragState,
    currentMouseX: state.currentMouseX,
    snapTime: state.snapTime,
    screenXToContainerX,
    containerRef,
  });

  const interactions = useTimelineInteractions<Data, TLaneMeta>({
    core: state,
    layout,
    containerRef,
    screenXToContainerX,
    options: interactionOptions,
  });

  const {
    visibleLaneRows,
    itemsForTimeline,
    baseDateZoned,
    mergedItems,
    timeZone,
    scrollOffset,
    verticalScrollOffset,
    zoom,
    snapOption,
    setSnapOption,
    setZoom,
    dragState,
    panState,
    selectedItemId,
    snapTime,
    toggleLaneExpanded,
  } = state;

  const {
    pixelsPerMinute,
    getLaneHeight,
    getLaneYOffset,
    getItemsWithRows,
    timeToPixel,
    getVisibleRange,
    calculatedPreviewItem,
    totalHeight,
  } = layout;

  const {
    handleItemMouseDown,
    handleLaneMouseDown,
    onTimelineGridMouseDown,
    drawingPreview,
    itemActivateTrigger,
    activateItemOnClick,
  } = interactions;

  const { startTime, endTime } = getVisibleRange();

  // Calculate spacing in pixels to determine label density
  const hourSpacingPx = 60 * pixelsPerMinute; // 60 minutes per hour
  const daySpacingPx = 1440 * pixelsPerMinute; // 1440 minutes per day
  const quarterSpacingPx = 15 * pixelsPerMinute; // 15 minutes

  // Determine time scale based on zoom level
  type TimeScale = "hours" | "days" | "weeks" | "months" | "quarters";
  const getTimeScale = (): TimeScale => {
    if (daySpacingPx < 14) return "quarters"; // Very zoomed out - Q1, Q2, …
    if (daySpacingPx < 20) return "months"; // Zoomed out - month ticks
    if (daySpacingPx < 50) return "weeks";
    if (daySpacingPx < 200) return "days";
    return "hours";
  };

  const timeScale = getTimeScale();

  // Determine label interval for hour view
  const getLabelInterval = (): number => {
    if (hourSpacingPx < 20) return 12 * 60; // 12 hours
    if (hourSpacingPx < 30) return 6 * 60; // 6 hours
    if (hourSpacingPx < 80) return 3 * 60; // 3 hours
    return 60; // 1 hour (all hours)
  };

  const labelInterval = getLabelInterval();
  const showQuarterLabels = quarterSpacingPx >= 55; // Show 15-min labels when spacing is good

  // Generate markers based on time scale
  const hourMarkers: number[] = [];
  const quarterMarkers: number[] = [];
  const dayMarkers: number[] = [];
  const weekMarkers: number[] = [];
  const monthMarkers: number[] = [];
  const yearMarkers: number[] = [];
  const quarterScaleMarkers: number[] = [];

  if (timeScale === "hours") {
    // Generate time markers (hourly with 15-min subdivisions)
    const startHour = Math.floor(startTime / 60) * 60;
    const endHour = Math.ceil(endTime / 60) * 60;

    for (let t = startHour; t <= endHour; t += 60) {
      hourMarkers.push(t);
    }

    // Only show quarter markers if hour spacing is reasonable
    if (hourSpacingPx >= 30) {
      for (let t = startHour; t <= endHour; t += 15) {
        if (t % 60 !== 0) {
          quarterMarkers.push(t);
        }
      }
    }

    // Generate day markers for top header (local civil midnights, not fixed 1440 blocks)
    dayMarkers.push(
      ...collectDayMarkerMinutesForRange(
        startTime,
        endTime,
        baseDateZoned,
      ),
    );
  } else if (timeScale === "days") {
    // Show days in time header, months in top header
    dayMarkers.push(
      ...collectDayMarkerMinutesForRange(
        startTime,
        endTime,
        baseDateZoned,
      ),
    );

    monthMarkers.push(
      ...collectMonthStartMinutesForRange(
        startTime,
        endTime,
        baseDateZoned,
        timeZone,
      ),
    );
  } else if (timeScale === "weeks") {
    // Show weeks in time header, months in top header
    const endLimit = getZonedDayAfterEndMinutes(endTime, baseDateZoned);
    const startDay = getZonedDayStartMinutes(startTime, baseDateZoned);

    const currentWeek = alignDayMinutesToWeekStart(startDay, baseDateZoned);

    for (let w = currentWeek; w <= endLimit; w += 10080) {
      // 7 days = 10080 minutes
      weekMarkers.push(w);
    }

    monthMarkers.push(
      ...collectMonthStartMinutesForRange(
        startTime,
        endTime,
        baseDateZoned,
        timeZone,
      ),
    );
  } else if (timeScale === "quarters") {
    quarterScaleMarkers.push(
      ...collectQuarterStartMinutesForRange(
        startTime,
        endTime,
        baseDateZoned,
        timeZone,
      ),
    );
    yearMarkers.push(
      ...collectYearStartMinutesForRange(
        startTime,
        endTime,
        baseDateZoned,
        timeZone,
      ),
    );
  } else if (timeScale === "months") {
    monthMarkers.push(
      ...collectMonthStartMinutesForRange(
        startTime,
        endTime,
        baseDateZoned,
        timeZone,
      ),
    );
    yearMarkers.push(
      ...collectYearStartMinutesForRange(
        startTime,
        endTime,
        baseDateZoned,
        timeZone,
      ),
    );
  }
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden select-none rounded-md">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-medium text-foreground">
            Timeline Editor
          </h2>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <span>Drag to pan</span>
            <span className="text-border">|</span>
            <span>Scroll to scroll vertically</span>
            <span className="text-border">|</span>
            <span>Shift+Scroll to pan horizontally</span>
            <span className="text-border">|</span>
            <span>Ctrl+Scroll to zoom</span>
            <span className="text-border">|</span>
            <span>Middle mouse or Cmd+Click to draw</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Snap Options */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Snap:</span>
            <Select
              value={snapOption}
              onValueChange={(value) => setSnapOption(value as SnapOption)}
            >
              <SelectTrigger className="h-7 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="5min">5 min</SelectItem>
                <SelectItem value="15min">15 min</SelectItem>
                <SelectItem value="30min">30 min</SelectItem>
                <SelectItem value="1hour">1 hour</SelectItem>
                <SelectItem value="1day">1 day</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Zoom:{" "}
              {(() => {
                const p = zoom * 100;
                if (p < 0.01) return `${p.toFixed(3)}%`;
                if (p < 1) return `${p.toFixed(2)}%`;
                return `${Math.round(p)}%`;
              })()}
            </span>
            <Button
              onClick={() => setZoom(1)}
              variant="outline"
              className="h-7"
              size="xs"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Main Timeline Area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{
          cursor: panState
            ? "grabbing"
            : dragState && dragState.type === "draw"
              ? "crosshair"
              : dragState
                ? "grabbing"
                : "grab",
        }}
      >
        {/* Date Header */}
        <div
          className="absolute top-0 left-0 right-0 h-6 bg-secondary/50 border-b border-border z-20"
          style={{ paddingLeft: SIDEBAR_WIDTH }}
        >
          <div className="relative h-full overflow-hidden">
            {timeScale === "hours" &&
              dayMarkers.map((minutes) => {
                const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                const containerWidth =
                  containerRef.current?.clientWidth || 2000;
                if (x < -200 || x > containerWidth + 200) return null;

                return (
                  <div
                    key={`day-${minutes}`}
                    className="absolute top-0 h-full flex items-center"
                    style={{ left: x }}
                  >
                    <span className="text-xs font-medium text-foreground -translate-x-1/2">
                      {formatDate(minutes, baseDateZoned)}
                    </span>
                  </div>
                );
              })}
            {(timeScale === "days" || timeScale === "weeks") &&
              monthMarkers.map((minutes) => {
                const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                const containerWidth =
                  containerRef.current?.clientWidth || 2000;
                if (x < -200 || x > containerWidth + 200) return null;

                return (
                  <div
                    key={`month-${minutes}`}
                    className="absolute top-0 h-full flex items-center"
                    style={{ left: x }}
                  >
                    <span className="text-xs font-medium text-foreground -translate-x-1/2">
                      {formatMonthYear(minutes, baseDateZoned)}
                    </span>
                  </div>
                );
              })}
            {(timeScale === "months" || timeScale === "quarters") &&
              yearMarkers.map((minutes) => {
                const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                const containerWidth =
                  containerRef.current?.clientWidth || 2000;
                if (x < -200 || x > containerWidth + 200) return null;

                return (
                  <div
                    key={`year-${minutes}`}
                    className="absolute top-0 h-full flex items-center"
                    style={{ left: x }}
                  >
                    <span className="text-xs font-medium text-foreground -translate-x-1/2">
                      {formatYear(minutes, baseDateZoned)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Time Header */}
        <div
          className="absolute top-6 left-0 right-0 h-8 bg-card border-b border-border z-20"
          style={{ paddingLeft: SIDEBAR_WIDTH }}
        >
          <div className="relative h-full overflow-hidden">
            {timeScale === "hours" && (
              <>
                {/* Quarter hour ticks */}
                {quarterMarkers.map((minutes) => {
                  const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                  const containerWidth =
                    containerRef.current?.clientWidth || 2000;
                  if (x < -50 || x > containerWidth) return null;

                  // Show label if 15-minute labels are enabled
                  const shouldShowLabel = showQuarterLabels;

                  return (
                    <div
                      key={`q-${minutes}`}
                      className="absolute top-0 h-full flex flex-col justify-end pb-1"
                      style={{ left: x }}
                    >
                      {shouldShowLabel && (
                        <span className="text-xs tabular-nums -translate-x-1/2 text-muted-foreground">
                          {formatTime(minutes)}
                        </span>
                      )}
                      <div
                        className={cn(
                          "w-px mt-0.5 ml-0",
                          shouldShowLabel ? "h-1 bg-border" : "h-1 bg-border",
                        )}
                      />
                    </div>
                  );
                })}

                {/* Hour markers */}
                {hourMarkers.map((minutes) => {
                  const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                  const containerWidth =
                    containerRef.current?.clientWidth || 2000;
                  if (x < -50 || x > containerWidth) return null;

                  // Get hour of day (0-23) for this marker
                  // Normalize to handle negative minutes correctly
                  const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;
                  const hourOfDay = Math.floor(normalizedMinutes / 60);

                  // Determine if this hour should show a label based on interval
                  let shouldShowLabel = false;
                  if (labelInterval === 60) {
                    // Show all hours
                    shouldShowLabel = true;
                  } else if (labelInterval === 3 * 60) {
                    // Show every 3 hours: 0, 3, 6, 9, 12, 15, 18, 21
                    shouldShowLabel = hourOfDay % 3 === 0;
                  } else if (labelInterval === 6 * 60) {
                    // Show every 6 hours: 0, 6, 12, 18
                    shouldShowLabel = hourOfDay % 6 === 0;
                  } else if (labelInterval === 12 * 60) {
                    // Show every 12 hours: 0, 12
                    shouldShowLabel = hourOfDay % 12 === 0;
                  }

                  const isMainHour = minutes % 60 === 0;
                  const isMajorMarker = minutes % 360 === 0; // Every 6 hours

                  return (
                    <div
                      key={`h-${minutes}`}
                      className="absolute top-0 h-full flex flex-col justify-end pb-1"
                      style={{ left: x }}
                    >
                      {shouldShowLabel && (
                        <span
                          className={cn(
                            "text-xs tabular-nums -translate-x-1/2",
                            isMainHour
                              ? "text-foreground font-medium"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatTime(minutes)}
                        </span>
                      )}
                      <div
                        className={cn(
                          "w-px mt-0.5 ml-0",
                          isMajorMarker
                            ? "h-2 bg-foreground/50"
                            : shouldShowLabel
                              ? "h-1.5 bg-muted-foreground"
                              : "h-1 bg-border/60",
                        )}
                      />
                    </div>
                  );
                })}
              </>
            )}

            {timeScale === "days" &&
              dayMarkers.map((minutes) => {
                const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                const containerWidth =
                  containerRef.current?.clientWidth || 2000;
                if (x < -50 || x > containerWidth) return null;

                const zAt = minutesToZonedDateTime(minutes, baseDateZoned);
                const isFirstOfMonth = zAt.day === 1;

                return (
                  <div
                    key={`day-${minutes}`}
                    className="absolute top-0 h-full flex flex-col justify-end pb-1"
                    style={{ left: x }}
                  >
                    <span
                      className={cn(
                        "text-xs tabular-nums -translate-x-1/2",
                        isFirstOfMonth
                          ? "text-foreground font-medium"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatMonthDay(minutes, baseDateZoned)}
                    </span>
                    <div
                      className={cn(
                        "w-px mt-0.5 ml-0",
                        isFirstOfMonth
                          ? "h-2 bg-foreground/50"
                          : "h-1 bg-border/60",
                      )}
                    />
                  </div>
                );
              })}

            {timeScale === "weeks" &&
              weekMarkers.map((minutes) => {
                const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                const containerWidth =
                  containerRef.current?.clientWidth || 2000;
                if (x < -50 || x > containerWidth) return null;

                const zAt = minutesToZonedDateTime(minutes, baseDateZoned);
                const isFirstOfMonth = zAt.day <= 7;

                return (
                  <div
                    key={`week-${minutes}`}
                    className="absolute top-0 h-full flex flex-col justify-end pb-1"
                    style={{ left: x }}
                  >
                    <span
                      className={cn(
                        "text-xs tabular-nums -translate-x-1/2",
                        isFirstOfMonth
                          ? "text-foreground font-medium"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatWeek(minutes, baseDateZoned)}
                    </span>
                    <div
                      className={cn(
                        "w-px mt-0.5 ml-0",
                        isFirstOfMonth
                          ? "h-2 bg-foreground/50"
                          : "h-1 bg-border/60",
                      )}
                    />
                  </div>
                );
              })}

            {timeScale === "quarters" &&
              quarterScaleMarkers.map((minutes) => {
                const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                const containerWidth =
                  containerRef.current?.clientWidth || 2000;
                if (x < -50 || x > containerWidth) return null;

                const zAt = minutesToZonedDateTime(minutes, baseDateZoned);
                const isQ1 = zAt.month === 1;

                return (
                  <div
                    key={`cal-quarter-${minutes}`}
                    className="absolute top-0 h-full flex flex-col justify-end pb-1"
                    style={{ left: x }}
                  >
                    <span
                      className={cn(
                        "text-xs tabular-nums -translate-x-1/2",
                        isQ1
                          ? "text-foreground font-medium"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatQuarter(minutes, baseDateZoned)}
                    </span>
                    <div
                      className={cn(
                        "w-px mt-0.5 ml-0",
                        isQ1 ? "h-2 bg-foreground/50" : "h-1 bg-border/60",
                      )}
                    />
                  </div>
                );
              })}

            {timeScale === "months" &&
              monthMarkers.map((minutes) => {
                const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                const containerWidth =
                  containerRef.current?.clientWidth || 2000;
                if (x < -50 || x > containerWidth) return null;

                const zAt = minutesToZonedDateTime(minutes, baseDateZoned);
                const isQuarter = (zAt.month - 1) % 3 === 0;

                return (
                  <div
                    key={`month-${minutes}`}
                    className="absolute top-0 h-full flex flex-col justify-end pb-1"
                    style={{ left: x }}
                  >
                    <span
                      className={cn(
                        "text-xs tabular-nums -translate-x-1/2",
                        isQuarter
                          ? "text-foreground font-medium"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatMonthShort(minutes, baseDateZoned)}
                    </span>
                    <div
                      className={cn(
                        "w-px mt-0.5 ml-0",
                        isQuarter ? "h-2 bg-foreground/50" : "h-1 bg-border/60",
                      )}
                    />
                  </div>
                );
              })}
          </div>
        </div>

        {/* Lane Labels (Sidebar) */}
        <div
          className="absolute top-14 left-0 bottom-0 bg-card border-r border-border z-10 overflow-hidden"
          style={{
            width: SIDEBAR_WIDTH,
          }}
        >
          <div
            style={{
              transform: `translateY(-${verticalScrollOffset}px)`,
              position: "relative",
            }}
          >
            {visibleLaneRows.map((lane, index) => {
              const lanePreview =
                calculatedPreviewItem &&
                calculatedPreviewItem.laneId === lane.id
                  ? calculatedPreviewItem
                  : undefined;
              const rowHeight = getLaneHeight(lane.id, lanePreview);
              const indentPx = 8 + lane.depth * 12;
              const zebra =
                index % 2 === 0 ? "bg-timeline-lane" : "bg-timeline-lane-alt";
              const rowInnerClass = cn(
                "flex h-full min-h-0 min-w-0 w-full items-center gap-2 py-2 pr-2 text-left",
                lane.hasChildren &&
                  cn(
                    "cursor-pointer rounded-sm",
                    "text-foreground hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  ),
              );

              const labelBlock = (
                <>
                  <span
                    className="flex size-6 shrink-0 items-center justify-center text-muted-foreground"
                    aria-hidden={!lane.hasChildren}
                  >
                    {lane.hasChildren ? (
                      <ChevronRight
                        className={cn(
                          "size-4 shrink-0 transition-transform",
                          lane.expanded && "rotate-90",
                        )}
                      />
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full ring-1 ring-border/40 ring-inset",
                      lane.color,
                    )}
                  />
                  <span className="min-w-0 flex-1 text-xs leading-snug text-foreground [overflow-wrap:anywhere]">
                    {lane.name}
                  </span>
                </>
              );

              return (
                <div
                  key={lane.id}
                  className={cn(
                    "min-h-0 min-w-0 border-b border-border",
                    zebra,
                  )}
                  style={{ height: rowHeight }}
                >
                  {lane.hasChildren ? (
                    <button
                      type="button"
                      data-timeline-lane-expand
                      className={rowInnerClass}
                      style={{ paddingLeft: indentPx }}
                      aria-expanded={lane.expanded}
                      aria-label={`${lane.expanded ? "Collapse" : "Expand"} ${lane.name} sublanes`}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleLaneExpanded(lane.id);
                      }}
                    >
                      {labelBlock}
                    </button>
                  ) : (
                    <div
                      className={rowInnerClass}
                      style={{ paddingLeft: indentPx }}
                    >
                      {labelBlock}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline Grid and Items */}
        <div
          className="absolute top-14 bottom-0 overflow-hidden"
          style={{
            left: SIDEBAR_WIDTH,
            right: 0,
          }}
          onMouseDown={onTimelineGridMouseDown}
        >
          <div
            style={{
              transform: `translateY(-${verticalScrollOffset}px)`,
              position: "relative",
            }}
          >
            {/* Grid Lines */}
            <div className="absolute inset-0 pointer-events-none">
              {timeScale === "hours" && (
                <>
                  {/* Quarter hour lines (subtle) */}
                  {quarterMarkers.map((minutes) => {
                    const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                    const containerWidth =
                      containerRef.current?.clientWidth || 2000;
                    if (x < 0 || x > containerWidth) return null;

                    return (
                      <div
                        key={`qgrid-${minutes}`}
                        className="absolute top-0 w-px bg-border/20"
                        style={{ left: x, height: totalHeight }}
                      />
                    );
                  })}

                  {/* Hour lines */}
                  {hourMarkers.map((minutes) => {
                    const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                    const containerWidth =
                      containerRef.current?.clientWidth || 2000;
                    if (x < 0 || x > containerWidth) return null;

                    return (
                      <div
                        key={`hgrid-${minutes}`}
                        className={cn(
                          "absolute top-0 w-px",
                          minutes % 360 === 0
                            ? "bg-timeline-grid"
                            : "bg-border/40",
                        )}
                        style={{ left: x, height: totalHeight }}
                      />
                    );
                  })}

                  {/* Day lines */}
                  {dayMarkers.map((minutes) => {
                    const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                    const containerWidth =
                      containerRef.current?.clientWidth || 2000;
                    if (x < 0 || x > containerWidth) return null;

                    return (
                      <div
                        key={`dgrid-${minutes}`}
                        className="absolute top-0 w-0.5 bg-primary/30"
                        style={{ left: x, height: totalHeight }}
                      />
                    );
                  })}
                </>
              )}

              {timeScale === "days" && (
                <>
                  {/* Day lines */}
                  {dayMarkers.map((minutes) => {
                    const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                    const containerWidth =
                      containerRef.current?.clientWidth || 2000;
                    if (x < 0 || x > containerWidth) return null;

                    const zAt = minutesToZonedDateTime(minutes, baseDateZoned);
                    const isFirstOfMonth = zAt.day === 1;

                    return (
                      <div
                        key={`dgrid-${minutes}`}
                        className={cn(
                          "absolute top-0 w-px",
                          isFirstOfMonth ? "bg-primary/30" : "bg-border/40",
                        )}
                        style={{ left: x, height: totalHeight }}
                      />
                    );
                  })}

                  {/* Month lines */}
                  {monthMarkers.map((minutes) => {
                    const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                    const containerWidth =
                      containerRef.current?.clientWidth || 2000;
                    if (x < 0 || x > containerWidth) return null;

                    return (
                      <div
                        key={`mgrid-${minutes}`}
                        className="absolute top-0 w-0.5 bg-primary/50"
                        style={{ left: x, height: totalHeight }}
                      />
                    );
                  })}
                </>
              )}

              {timeScale === "weeks" && (
                <>
                  {/* Week lines */}
                  {weekMarkers.map((minutes) => {
                    const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                    const containerWidth =
                      containerRef.current?.clientWidth || 2000;
                    if (x < 0 || x > containerWidth) return null;

                    const zAt = minutesToZonedDateTime(minutes, baseDateZoned);
                    const isFirstOfMonth = zAt.day <= 7;

                    return (
                      <div
                        key={`wgrid-${minutes}`}
                        className={cn(
                          "absolute top-0 w-px",
                          isFirstOfMonth ? "bg-primary/30" : "bg-border/40",
                        )}
                        style={{ left: x, height: totalHeight }}
                      />
                    );
                  })}

                  {/* Month lines */}
                  {monthMarkers.map((minutes) => {
                    const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                    const containerWidth =
                      containerRef.current?.clientWidth || 2000;
                    if (x < 0 || x > containerWidth) return null;

                    return (
                      <div
                        key={`mgrid-${minutes}`}
                        className="absolute top-0 w-0.5 bg-primary/50"
                        style={{ left: x, height: totalHeight }}
                      />
                    );
                  })}
                </>
              )}

              {timeScale === "quarters" && (
                <>
                  {quarterScaleMarkers.map((minutes) => {
                    const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                    const containerWidth =
                      containerRef.current?.clientWidth || 2000;
                    if (x < 0 || x > containerWidth) return null;

                    const zAt = minutesToZonedDateTime(minutes, baseDateZoned);
                    const isQ1 = zAt.month === 1;

                    return (
                      <div
                        key={`qgrid-cal-${minutes}`}
                        className={cn(
                          "absolute top-0 w-px",
                          isQ1 ? "bg-primary/50" : "bg-border/40",
                        )}
                        style={{ left: x, height: totalHeight }}
                      />
                    );
                  })}
                  {yearMarkers.map((minutes) => {
                    const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                    const containerWidth =
                      containerRef.current?.clientWidth || 2000;
                    if (x < 0 || x > containerWidth) return null;

                    return (
                      <div
                        key={`ygrid-q-${minutes}`}
                        className="absolute top-0 w-0.5 bg-primary/60"
                        style={{ left: x, height: totalHeight }}
                      />
                    );
                  })}
                </>
              )}

              {timeScale === "months" && (
                <>
                  {/* Month lines */}
                  {monthMarkers.map((minutes) => {
                    const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                    const containerWidth =
                      containerRef.current?.clientWidth || 2000;
                    if (x < 0 || x > containerWidth) return null;

                    const zAt = minutesToZonedDateTime(minutes, baseDateZoned);
                    const isQuarter = (zAt.month - 1) % 3 === 0;
                    const isYearStart = zAt.month === 1;

                    return (
                      <div
                        key={`mgrid-${minutes}`}
                        className={cn(
                          "absolute top-0 w-px",
                          isYearStart
                            ? "bg-primary/50"
                            : isQuarter
                              ? "bg-primary/30"
                              : "bg-border/40",
                        )}
                        style={{ left: x, height: totalHeight }}
                      />
                    );
                  })}

                  {/* Year lines (thicker) */}
                  {yearMarkers.map((minutes) => {
                    const x = timeToPixel(minutes) - SIDEBAR_WIDTH;
                    const containerWidth =
                      containerRef.current?.clientWidth || 2000;
                    if (x < 0 || x > containerWidth) return null;

                    return (
                      <div
                        key={`ygrid-${minutes}`}
                        className="absolute top-0 w-0.5 bg-primary/60"
                        style={{ left: x, height: totalHeight }}
                      />
                    );
                  })}
                </>
              )}
            </div>

            {/* Lanes */}
            {visibleLaneRows.map((lane, laneIndex) => {
              const previewForLane =
                calculatedPreviewItem &&
                calculatedPreviewItem.laneId === lane.id
                  ? calculatedPreviewItem
                  : undefined;
              const itemsWithRows = getItemsWithRows(lane.id, previewForLane);
              const laneHeight = getLaneHeight(lane.id, previewForLane);
              const yOffset = getLaneYOffset(laneIndex);

              return (
                <div
                  key={lane.id}
                  data-timeline-lane
                  className={cn(
                    "absolute left-0 right-0 border-b border-border",
                    laneIndex % 2 === 0
                      ? "bg-timeline-lane"
                      : "bg-timeline-lane-alt",
                  )}
                  style={{
                    top: yOffset,
                    height: laneHeight,
                  }}
                  onMouseDown={(e) => handleLaneMouseDown(e, lane.id)}
                >
                  {/* Items in this lane */}
                  {itemsWithRows.map((item) => {
                    const left = timeToPixel(item.start) - SIDEBAR_WIDTH;
                    const naturalWidth =
                      (item.end - item.start) * pixelsPerMinute;
                    const MIN_VISIBLE_WIDTH = 3;
                    const isMinWidth = naturalWidth < MIN_VISIBLE_WIDTH;
                    const width = Math.max(naturalWidth, MIN_VISIBLE_WIDTH);
                    const externalItem = toExternalItem(item, baseDateZoned);
                    const selected = isEventSelected?.(externalItem) ?? false;
                    const isSelected = selected || selectedItemId === item.id;

                    // Convert internal item to external format for renderItem callback
                    const itemProps = {
                      item: externalItem,
                      left,
                      width,
                      isSelected,
                      selected,
                      isMinWidth,
                      onMouseDown: (
                        e: ReactMouseEvent,
                        item: TimelineItem<Data>,
                        type: "move" | "resize-start" | "resize-end",
                      ) => {
                        // Convert back to internal for drag handling
                        const internalItem = toInternalItem(
                          item,
                          baseDateZoned,
                        );
                        handleItemMouseDown(e, internalItem, type);
                      },
                      onMouseOver: onItemHover
                        ? () => onItemHover(externalItem)
                        : undefined,
                      onClick:
                        itemActivateTrigger === "click"
                          ? (e: ReactMouseEvent, clicked: TimelineItem<Data>) =>
                              activateItemOnClick(e, clicked)
                          : undefined,
                    };

                    return (
                      <React.Fragment key={item.id}>
                        {renderItem ? (
                          renderItem(itemProps)
                        ) : (
                          <DefaultTimelineItem {...itemProps} />
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* Drawing Preview */}
                  {drawingPreview && drawingPreview.laneId === lane.id && (
                    <DrawingPreview<TLaneMeta>
                      lane={lane}
                      startTime={drawingPreview.startTime}
                      timeToPixel={(t) => timeToPixel(t) - SIDEBAR_WIDTH}
                      laneIndex={laneIndex}
                      containerRef={containerRef}
                      pixelsPerMinute={pixelsPerMinute}
                      scrollOffset={scrollOffset}
                      snapTime={snapTime}
                      baseDateZoned={baseDateZoned}
                      snapOption={snapOption}
                      previewRow={
                        previewForLane ? previewForLane.row : undefined
                      }
                      existingItems={itemsWithRows}
                      renderDrawingPreviewLabel={renderDrawingPreviewLabel}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Current time indicator (now line) */}
        {(() => {
          const now = timelineZonedNow(timeZone);
          // Calculate minutes from baseDate to now
          const nowMinutes = zonedDateTimeToMinutes(now, baseDateZoned);
          const x = timeToPixel(nowMinutes);
          if (
            x < SIDEBAR_WIDTH ||
            x > (containerRef.current?.clientWidth || 2000)
          )
            return null;

          return (
            <div
              className="absolute bottom-0 w-px bg-destructive z-30 pointer-events-none"
              style={{ left: x, top: HEADER_HEIGHT + 8 }}
              title="Now"
            >
              <div className="absolute top-0 -translate-x-[calc(50%-0.5px)] size-2.5 bg-destructive rounded-b-full" />
            </div>
          );
        })()}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 h-8 border-t border-border bg-card text-xs text-muted-foreground">
        <span>
          {itemsForTimeline.length} events across {visibleLaneRows.length}{" "}
          tracks
        </span>
        <div className="flex items-center gap-4">
          {selectedItemId &&
            (() => {
              const item = mergedItems.find((i) => i.id === selectedItemId);
              if (!item) return null;
              return (
                <span>
                  {item.label}: {formatTime(item.start)} -{" "}
                  {formatTime(item.end)}
                </span>
              );
            })()}
          <span className="text-muted-foreground/60">
            Press Delete to remove selected
          </span>
        </div>
      </div>
    </div>
  );
}

// Drawing Preview Component
function DrawingPreview<TLaneMeta = unknown>({
  lane,
  startTime,
  timeToPixel,
  laneIndex,
  containerRef,
  pixelsPerMinute,
  scrollOffset,
  snapTime,
  baseDateZoned,
  snapOption,
  previewRow: previewRowProp,
  existingItems,
  renderDrawingPreviewLabel,
}: {
  lane: VisibleTimelineLaneRow<TLaneMeta>;
  startTime: number;
  timeToPixel: (time: number) => number;
  laneIndex: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  pixelsPerMinute: number;
  scrollOffset: number;
  snapTime: (time: number) => number;
  baseDateZoned: ZonedDateTime;
  snapOption: SnapOption;
  previewRow?: number;
  existingItems: (TimelineItemInternal<unknown> & { row: number })[];
  renderDrawingPreviewLabel?: (
    params: DrawingPreviewLabelParams,
    lane: VisibleTimelineLaneRow<TLaneMeta>,
  ) => React.ReactNode;
}) {
  // Initialize with the start position so it doesn't flash from -infinity
  const initialRect = containerRef.current?.getBoundingClientRect();
  const initialX = initialRect
    ? timeToPixel(startTime) + initialRect.left + SIDEBAR_WIDTH
    : 0;
  const [currentX, setCurrentX] = useState(initialX);

  useEffect(() => {
    const handleMove = (e: globalThis.MouseEvent) => {
      setCurrentX(e.clientX);
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  // Convert screen X to container-relative X
  const rect = containerRef.current?.getBoundingClientRect();
  const containerX = rect ? currentX - rect.left : currentX;
  const currentTime = snapTime(
    (containerX - SIDEBAR_WIDTH - scrollOffset) / pixelsPerMinute,
  );
  const previewStart = Math.min(startTime, currentTime);
  const previewEnd = Math.max(startTime, currentTime);

  // Use the preview row from calculatedPreviewItem if provided, otherwise calculate it
  // This ensures the preview row matches exactly what the final row will be
  const calculateRow = () => {
    if (previewRowProp !== undefined) {
      return previewRowProp;
    }
    // Fallback calculation if previewRow not provided
    let row = 0;
    let foundRow = false;
    while (!foundRow) {
      const hasOverlap = existingItems.some((placed) => {
        if (placed.row !== row) return false;
        return timelineItemsTimeOverlap(
          { start: previewStart, end: previewEnd },
          placed,
        );
      });
      if (!hasOverlap) {
        foundRow = true;
      } else {
        row++;
      }
    }
    return row;
  };

  const row = calculateRow();

  const left = timeToPixel(previewStart);
  const right = timeToPixel(previewEnd);
  const naturalWidth = right - left;
  const MIN_VISIBLE_WIDTH = 3;
  const isMinWidth = naturalWidth < MIN_VISIBLE_WIDTH;
  const width = Math.max(naturalWidth, MIN_VISIBLE_WIDTH);

  const color = ITEM_COLORS[laneIndex % ITEM_COLORS.length];

  const rangeLabel = formatDrawPreviewRange(
    previewStart,
    previewEnd,
    baseDateZoned,
    snapOption,
  );

  const labelContent = renderDrawingPreviewLabel
    ? renderDrawingPreviewLabel(
        {
          previewStartMinutes: previewStart,
          previewEndMinutes: previewEnd,
          baseDate: baseDateZoned,
          snapOption,
        },
        lane,
      )
    : rangeLabel;

  return (
    <div
      className={cn(
        "absolute overflow-hidden rounded opacity-60",
        color,
        isMinWidth && "ring-1 ring-foreground/80",
      )}
      style={{
        left,
        width,
        top: 8 + row * SUB_ROW_HEIGHT,
        height: SUB_ROW_HEIGHT - 4,
      }}
      title={rangeLabel}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-2 inset-y-0 z-[1] flex items-center overflow-hidden",
          isMinWidth && "inset-x-1",
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left text-xs font-medium text-primary-foreground">
          {labelContent}
        </span>
      </div>
    </div>
  );
}
