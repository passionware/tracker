"use client";

import type { ZonedDateTime } from "@internationalized/date";
import { memo, useCallback, useMemo, type RefObject } from "react";
import { cn } from "@/lib/utils";
import type { TimelineItemInternal } from "./passionware-timeline-core.ts";
import {
  ITEM_COLORS,
  RULER_TRACK_OVERFLOW_PX,
  SUB_ROW_HEIGHT,
  formatDrawPreviewRange,
  type DrawingPreviewLabelParams,
  type SnapOption,
  minutesToZonedDateTime,
  timelineItemsTimeOverlap,
} from "./passionware-timeline-core.ts";
import type { VisibleTimelineLaneRow } from "./timeline-lane-tree.ts";
import {
  computeCalculatedPreviewItem,
  getItemsWithRowsForLane,
  getLaneHeightForPreview,
  getLaneYOffsetForIndex,
  totalLanesHeight,
  type LanePreviewShape,
} from "./timeline-layout-logic.ts";
import { TimelineMergedItemCell } from "./timeline-merged-item-cell.tsx";
import { useTimelineHandlersRef } from "./timeline-handlers-ref-context.tsx";
import { useTimelineRefs } from "./timeline-refs-context.tsx";
import type { InfiniteTimelineProps } from "./timeline-infinite-types.ts";
import { TimelineTimeRangeShadowLayer } from "./timeline-time-range-shadow-layer.tsx";
import { useTimelineRulerLayout } from "./use-timeline-ruler-layout.ts";
import {
  useTimelineCurrentMouseX,
  useTimelineDragState,
  useTimelineMergedItems,
  useTimelineScrollOffset,
  useTimelineSnapOption,
  useTimelineSnapTime,
  useTimelineVerticalScrollOffset,
  useTimelineMinimizedLaneIds,
  useTimelineLaneSidebarWidth,
  useTimelineVisibleLaneRows,
  useTimelineZoom,
} from "./use-timeline-selectors.ts";

function DrawingPreview<Data = unknown, TLaneMeta = unknown>({
  lane,
  startTime,
  timeToPixel,
  laneIndex,
  containerRef,
  pixelsPerMinute,
  scrollOffset,
  laneSidebarWidthPx,
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
  containerRef: RefObject<HTMLDivElement | null>;
  pixelsPerMinute: number;
  scrollOffset: number;
  laneSidebarWidthPx: number;
  snapTime: (time: number) => number;
  baseDateZoned: ZonedDateTime;
  snapOption: SnapOption;
  previewRow?: number;
  existingItems: (TimelineItemInternal<Data> & { row: number })[];
  renderDrawingPreviewLabel?: (
    params: DrawingPreviewLabelParams,
    lane: VisibleTimelineLaneRow<TLaneMeta>,
  ) => import("react").ReactNode;
}) {
  const currentMouseX = useTimelineCurrentMouseX();
  const rect = containerRef.current?.getBoundingClientRect();
  let currentTime: number;
  if (currentMouseX !== null && rect) {
    const containerX = currentMouseX - rect.left;
    currentTime = snapTime(
      (containerX - laneSidebarWidthPx - scrollOffset) / pixelsPerMinute,
    );
  } else {
    currentTime = startTime;
  }
  const previewStart = Math.min(startTime, currentTime);
  const previewEnd = Math.max(startTime, currentTime);

  const calculateRow = () => {
    if (previewRowProp !== undefined) {
      return previewRowProp;
    }
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
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-2 inset-y-0 z-[1] flex min-w-0 max-w-full items-center overflow-hidden",
          isMinWidth && "inset-x-1",
        )}
      >
        <span className="block min-w-0 w-full truncate text-left text-xs font-medium text-primary-foreground">
          {labelContent}
        </span>
      </div>
    </div>
  );
}

const TimelineGridLines = memo(function TimelineGridLines({
  totalHeight,
}: {
  totalHeight: number;
}) {
  const {
    timeToPixel,
    tracksContentWidth,
    timeScale,
    quarterMarkers,
    hourMarkers,
    dayMarkers,
    weekMarkers,
    monthMarkers,
    yearMarkers,
    quarterScaleMarkers,
    baseDateZoned,
  } = useTimelineRulerLayout();
  const laneSidebarWidthPx = useTimelineLaneSidebarWidth();

  return (
    <div className="absolute inset-0 pointer-events-none">
      {timeScale === "hours" && (
        <>
          {quarterMarkers.map((minutes) => {
            const x = timeToPixel(minutes) - laneSidebarWidthPx;
            if (
              x < -RULER_TRACK_OVERFLOW_PX ||
              x > tracksContentWidth + RULER_TRACK_OVERFLOW_PX
            ) {
              return null;
            }

            return (
              <div
                key={`qgrid-${minutes}`}
                className="absolute top-0 w-px bg-border/20"
                style={{ left: x, height: totalHeight }}
              />
            );
          })}

          {hourMarkers.map((minutes) => {
            const x = timeToPixel(minutes) - laneSidebarWidthPx;
            if (
              x < -RULER_TRACK_OVERFLOW_PX ||
              x > tracksContentWidth + RULER_TRACK_OVERFLOW_PX
            ) {
              return null;
            }

            return (
              <div
                key={`hgrid-${minutes}`}
                className={cn(
                  "absolute top-0 w-px",
                  minutes % 360 === 0 ? "bg-timeline-grid" : "bg-border/40",
                )}
                style={{ left: x, height: totalHeight }}
              />
            );
          })}

          {dayMarkers.map((minutes) => {
            const x = timeToPixel(minutes) - laneSidebarWidthPx;
            if (
              x < -RULER_TRACK_OVERFLOW_PX ||
              x > tracksContentWidth + RULER_TRACK_OVERFLOW_PX
            ) {
              return null;
            }

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
          {dayMarkers.map((minutes) => {
            const x = timeToPixel(minutes) - laneSidebarWidthPx;
            if (
              x < -RULER_TRACK_OVERFLOW_PX ||
              x > tracksContentWidth + RULER_TRACK_OVERFLOW_PX
            ) {
              return null;
            }

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

          {monthMarkers.map((minutes) => {
            const x = timeToPixel(minutes) - laneSidebarWidthPx;
            if (
              x < -RULER_TRACK_OVERFLOW_PX ||
              x > tracksContentWidth + RULER_TRACK_OVERFLOW_PX
            ) {
              return null;
            }

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
          {weekMarkers.map((minutes) => {
            const x = timeToPixel(minutes) - laneSidebarWidthPx;
            if (
              x < -RULER_TRACK_OVERFLOW_PX ||
              x > tracksContentWidth + RULER_TRACK_OVERFLOW_PX
            ) {
              return null;
            }

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

          {monthMarkers.map((minutes) => {
            const x = timeToPixel(minutes) - laneSidebarWidthPx;
            if (
              x < -RULER_TRACK_OVERFLOW_PX ||
              x > tracksContentWidth + RULER_TRACK_OVERFLOW_PX
            ) {
              return null;
            }

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
            const x = timeToPixel(minutes) - laneSidebarWidthPx;
            if (
              x < -RULER_TRACK_OVERFLOW_PX ||
              x > tracksContentWidth + RULER_TRACK_OVERFLOW_PX
            ) {
              return null;
            }

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
            const x = timeToPixel(minutes) - laneSidebarWidthPx;
            if (
              x < -RULER_TRACK_OVERFLOW_PX ||
              x > tracksContentWidth + RULER_TRACK_OVERFLOW_PX
            ) {
              return null;
            }

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
          {monthMarkers.map((minutes) => {
            const x = timeToPixel(minutes) - laneSidebarWidthPx;
            if (
              x < -RULER_TRACK_OVERFLOW_PX ||
              x > tracksContentWidth + RULER_TRACK_OVERFLOW_PX
            ) {
              return null;
            }

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

          {yearMarkers.map((minutes) => {
            const x = timeToPixel(minutes) - laneSidebarWidthPx;
            if (
              x < -RULER_TRACK_OVERFLOW_PX ||
              x > tracksContentWidth + RULER_TRACK_OVERFLOW_PX
            ) {
              return null;
            }

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
  );
});

type TracksPanelProps<Data = unknown, TLaneMeta = unknown> = Pick<
  InfiniteTimelineProps<Data, TLaneMeta>,
  | "renderItem"
  | "onItemHover"
  | "isEventSelected"
  | "renderDrawingPreviewLabel"
  | "timeRangeShadows"
> & {
  itemActivateTrigger: "mousedown" | "click";
};

function TimelineTracksPanelInner<Data = unknown, TLaneMeta = unknown>(
  props: TracksPanelProps<Data, TLaneMeta>,
) {
  const {
    renderItem,
    onItemHover,
    isEventSelected,
    renderDrawingPreviewLabel,
    itemActivateTrigger,
    timeRangeShadows,
  } = props;

  const { containerRef, screenXToContainerX } = useTimelineRefs();
  const handlersRef = useTimelineHandlersRef();

  const visibleLaneRows = useTimelineVisibleLaneRows<TLaneMeta>();
  const minimizedLaneIds = useTimelineMinimizedLaneIds();
  const mergedItems = useTimelineMergedItems<Data>();
  const scrollOffset = useTimelineScrollOffset();
  const verticalScrollOffset = useTimelineVerticalScrollOffset();
  const zoom = useTimelineZoom();
  const snapOption = useTimelineSnapOption();
  const dragState = useTimelineDragState<Data>();
  const snapTime = useTimelineSnapTime();
  const currentMouseX = useTimelineCurrentMouseX();
  const laneSidebarWidthPx = useTimelineLaneSidebarWidth();

  const drawingPreview =
    dragState && dragState.type === "draw" && dragState.drawStart !== undefined
      ? { laneId: dragState.laneId, startTime: dragState.drawStart }
      : null;

  const { timeToPixel, pixelsPerMinute, baseDateZoned } =
    useTimelineRulerLayout();

  const calculatedPreviewItem = useMemo(
    () =>
      computeCalculatedPreviewItem(
        dragState,
        currentMouseX,
        mergedItems,
        snapTime,
        scrollOffset,
        zoom,
        screenXToContainerX,
        laneSidebarWidthPx,
      ),
    [
      currentMouseX,
      dragState,
      laneSidebarWidthPx,
      mergedItems,
      screenXToContainerX,
      scrollOffset,
      snapTime,
      zoom,
    ],
  );

  const getLaneHeight = useCallback(
    (laneId: string, preview?: LanePreviewShape) => {
      const laneRow = visibleLaneRows.find((l) => l.id === laneId);
      return getLaneHeightForPreview(
        mergedItems,
        laneId,
        preview,
        laneRow?.minTrackHeightPx,
        minimizedLaneIds,
      );
    },
    [mergedItems, minimizedLaneIds, visibleLaneRows],
  );

  const getItemsWithRows = useCallback(
    (laneId: string, preview?: LanePreviewShape) =>
      getItemsWithRowsForLane(mergedItems, laneId, preview),
    [mergedItems],
  );

  const getLaneYOffset = useCallback(
    (laneIndex: number) =>
      getLaneYOffsetForIndex(
        visibleLaneRows,
        laneIndex,
        getLaneHeight,
        calculatedPreviewItem,
      ),
    [calculatedPreviewItem, getLaneHeight, visibleLaneRows],
  );

  const totalHeight = useMemo(
    () =>
      totalLanesHeight(visibleLaneRows, calculatedPreviewItem, getLaneHeight),
    [calculatedPreviewItem, getLaneHeight, visibleLaneRows],
  );

  return (
    <div
      className="absolute top-14 bottom-0 overflow-hidden"
      style={{
        left: laneSidebarWidthPx,
        right: 0,
      }}
      onPointerDown={(e) =>
        handlersRef.current?.onTimelineGridPointerDown(e)
      }
    >
      <div
        style={{
          transform: `translateY(-${verticalScrollOffset}px)`,
          position: "relative",
        }}
      >
        <TimelineGridLines totalHeight={totalHeight} />
        {visibleLaneRows.map((lane, laneIndex) => {
          const previewForLane =
            calculatedPreviewItem && calculatedPreviewItem.laneId === lane.id
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
              onPointerDown={(e) =>
                handlersRef.current?.handleLaneMouseDown(e, lane.id)
              }
            >
              <TimelineTimeRangeShadowLayer
                shadows={timeRangeShadows}
                totalHeight={laneHeight}
              />
              {itemsWithRows.map((rowItem) => (
                <TimelineMergedItemCell<Data>
                  key={rowItem.id}
                  itemId={rowItem.id}
                  layoutRow={rowItem.row}
                  laneTrackHeightPx={laneHeight}
                  renderItem={renderItem}
                  onItemHover={onItemHover}
                  isEventSelected={isEventSelected}
                  itemActivateTrigger={itemActivateTrigger}
                />
              ))}

              {drawingPreview && drawingPreview.laneId === lane.id && (
                <DrawingPreview<Data, TLaneMeta>
                  lane={lane}
                  startTime={drawingPreview.startTime}
                  timeToPixel={(t) => timeToPixel(t) - laneSidebarWidthPx}
                  laneIndex={laneIndex}
                  containerRef={containerRef}
                  pixelsPerMinute={pixelsPerMinute}
                  scrollOffset={scrollOffset}
                  laneSidebarWidthPx={laneSidebarWidthPx}
                  snapTime={snapTime}
                  baseDateZoned={baseDateZoned}
                  snapOption={snapOption}
                  previewRow={previewForLane ? previewForLane.row : undefined}
                  existingItems={itemsWithRows}
                  renderDrawingPreviewLabel={renderDrawingPreviewLabel}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const TimelineTracksPanel = memo(
  TimelineTracksPanelInner,
) as typeof TimelineTracksPanelInner;
