"use client";

import { ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { memo, useMemo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VisibleTimelineLaneRow } from "./timeline-lane-tree.ts";
import {
  computeCalculatedPreviewItem,
  getLaneHeightForPreview,
} from "./timeline-layout-logic.ts";
import { useTimelineRefs } from "./timeline-refs-context.tsx";
import {
  useTimelineCurrentMouseX,
  useTimelineDragState,
  useTimelineMergedItems,
  useTimelineMinimizedLaneIds,
  useTimelineScrollOffset,
  useTimelineSnapTime,
  useTimelineVerticalScrollOffset,
  useTimelineLaneSidebarWidth,
  useTimelineVisibleLaneRows,
  useTimelineZoom,
} from "./use-timeline-selectors.ts";

const TimelineLaneSidebarMinimizedRow = memo(function TimelineLaneSidebarMinimizedRow({
  lane,
  index,
  rowHeight,
  indentPx,
  toggleLaneMinimized,
  hideLaneControls,
}: {
  lane: VisibleTimelineLaneRow<unknown>;
  index: number;
  rowHeight: number;
  indentPx: number;
  toggleLaneMinimized: (laneId: string) => void;
  hideLaneControls?: boolean;
}) {
  const zebra =
    index % 2 === 0 ? "bg-timeline-lane" : "bg-timeline-lane-alt";
  return (
    <div
      className={cn("min-h-0 min-w-0 border-b border-border", zebra)}
      style={{ height: rowHeight }}
    >
      <div
        className="box-border flex h-full min-w-0 items-stretch gap-2 py-2 pr-2.5"
        style={{ paddingLeft: indentPx }}
      >
        <div
          className={cn(
            "relative flex min-h-0 min-w-0 flex-1 items-center rounded-md border border-border/60 bg-muted/30",
            "px-3 py-2 pr-12 shadow-sm",
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full ring-1 ring-border/40 ring-inset",
                lane.color,
              )}
            />
            <span className="min-w-0 truncate text-xs leading-snug text-muted-foreground">
              {lane.name}
            </span>
          </div>
          {hideLaneControls ? null : (
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              className="absolute top-1.5 right-1.5 shrink-0"
              aria-label={`Expand track ${lane.name}`}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleLaneMinimized(lane.id);
              }}
            >
              <Maximize2 />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

const TimelineLaneSidebarRow = memo(function TimelineLaneSidebarRow({
  lane,
  index,
  rowHeight,
  indentPx,
  toggleLaneExpanded,
  toggleLaneMinimized,
  renderLaneLabel,
  hideLaneControls,
}: {
  lane: VisibleTimelineLaneRow<unknown>;
  index: number;
  rowHeight: number;
  indentPx: number;
  toggleLaneExpanded: (laneId: string) => void;
  toggleLaneMinimized: (laneId: string) => void;
  renderLaneLabel?: (lane: VisibleTimelineLaneRow<unknown>) => ReactNode;
  hideLaneControls?: boolean;
}) {
  const zebra =
    index % 2 === 0 ? "bg-timeline-lane" : "bg-timeline-lane-alt";
  const rowInnerClass =
    "flex h-full min-h-0 min-w-0 w-full max-w-full items-center gap-1 py-2 pr-10 text-left";

  return (
    <div
      className={cn(
        "group relative min-h-0 min-w-0 border-b border-border",
        zebra,
      )}
      style={{ height: rowHeight }}
    >
      <div className={rowInnerClass} style={{ paddingLeft: indentPx }}>
        {lane.hasChildren ? (
          <Button
            type="button"
            data-timeline-lane-expand
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-muted-foreground"
            aria-expanded={lane.expanded}
            aria-label={`${lane.expanded ? "Collapse" : "Expand"} ${lane.name} sublanes`}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleLaneExpanded(lane.id);
            }}
          >
            <ChevronRight
              className={cn(
                "size-4 shrink-0 transition-transform",
                lane.expanded && "rotate-90",
              )}
            />
          </Button>
        ) : (
          <span className="size-6 shrink-0" aria-hidden />
        )}
        {lane.hasChildren ? (
          <button
            type="button"
            className={cn(
              "flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm text-left",
              "text-foreground hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
            aria-expanded={lane.expanded}
            aria-label={`${lane.expanded ? "Collapse" : "Expand"} ${lane.name} sublanes`}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleLaneExpanded(lane.id);
            }}
          >
            <span
              className={cn(
                "size-2 shrink-0 rounded-full ring-1 ring-border/40 ring-inset",
                lane.color,
              )}
            />
            <span className="min-w-0 w-0 flex-1 text-xs leading-snug text-foreground [overflow-wrap:anywhere]">
              {lane.name}
            </span>
          </button>
        ) : renderLaneLabel ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-hidden pr-1">
            {renderLaneLabel(lane)}
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full ring-1 ring-border/40 ring-inset",
                lane.color,
              )}
            />
            <span className="min-w-0 w-0 flex-1 text-xs leading-snug text-foreground [overflow-wrap:anywhere]">
              {lane.name}
            </span>
          </div>
        )}
      </div>
      {hideLaneControls ? null : (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={cn(
            "absolute top-1.5 right-2 shrink-0 text-muted-foreground",
            "opacity-0 transition-opacity duration-150",
            "group-hover:opacity-100 group-focus-within:opacity-100",
          )}
          aria-label={`Hide track content for ${lane.name}`}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleLaneMinimized(lane.id);
          }}
        >
          <Minimize2 />
        </Button>
      )}
    </div>
  );
});

function TimelineLaneSidebarBlockInner<
  Data = unknown,
  TLaneMeta = unknown,
>({
  toggleLaneExpanded,
  toggleLaneMinimized,
  renderLaneLabel,
  hideLaneControls,
}: {
  toggleLaneExpanded: (laneId: string) => void;
  toggleLaneMinimized: (laneId: string) => void;
  renderLaneLabel?: (lane: VisibleTimelineLaneRow<TLaneMeta>) => ReactNode;
  hideLaneControls?: boolean;
}) {
  const { screenXToContainerX } = useTimelineRefs();
  const visibleLaneRows = useTimelineVisibleLaneRows<TLaneMeta>();
  const mergedItems = useTimelineMergedItems<Data>();
  const minimizedLaneIds = useTimelineMinimizedLaneIds();
  const verticalScrollOffset = useTimelineVerticalScrollOffset();
  const scrollOffset = useTimelineScrollOffset();
  const zoom = useTimelineZoom();
  const dragState = useTimelineDragState<Data>();
  const snapTime = useTimelineSnapTime();
  const currentMouseX = useTimelineCurrentMouseX();
  const laneSidebarWidthPx = useTimelineLaneSidebarWidth();

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

  return (
    <div
      className="absolute top-14 left-0 bottom-0 bg-card border-r border-border z-10 overflow-hidden"
      style={{ width: laneSidebarWidthPx }}
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
          const rowHeight = getLaneHeightForPreview(
            mergedItems,
            lane.id,
            lanePreview,
            lane.minTrackHeightPx,
            minimizedLaneIds,
          );
          const indentPx = 8 + lane.depth * 12;
          const isMinimized = minimizedLaneIds.has(lane.id);
          if (isMinimized) {
            return (
              <TimelineLaneSidebarMinimizedRow
                key={lane.id}
                lane={lane}
                index={index}
                rowHeight={rowHeight}
                indentPx={indentPx}
                toggleLaneMinimized={toggleLaneMinimized}
                hideLaneControls={hideLaneControls}
              />
            );
          }
          return (
            <TimelineLaneSidebarRow
              key={lane.id}
              lane={lane}
              index={index}
              rowHeight={rowHeight}
              indentPx={indentPx}
              toggleLaneExpanded={toggleLaneExpanded}
              toggleLaneMinimized={toggleLaneMinimized}
              renderLaneLabel={
                renderLaneLabel
                  ? (laneRow) =>
                      renderLaneLabel(
                        laneRow as VisibleTimelineLaneRow<TLaneMeta>,
                      )
                  : undefined
              }
              hideLaneControls={hideLaneControls}
            />
          );
        })}
      </div>
    </div>
  );
}

export const TimelineLaneSidebarBlock = memo(
  TimelineLaneSidebarBlockInner,
) as typeof TimelineLaneSidebarBlockInner;
