"use client";

import { ChevronRight } from "lucide-react";
import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { SIDEBAR_WIDTH } from "./passionware-timeline-core.ts";
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
  useTimelineScrollOffset,
  useTimelineSnapTime,
  useTimelineVerticalScrollOffset,
  useTimelineVisibleLaneRows,
  useTimelineZoom,
} from "./use-timeline-selectors.ts";

const TimelineLaneSidebarRow = memo(function TimelineLaneSidebarRow<
  TLaneMeta = unknown,
>({
  lane,
  index,
  rowHeight,
  toggleLaneExpanded,
}: {
  lane: VisibleTimelineLaneRow<TLaneMeta>;
  index: number;
  rowHeight: number;
  toggleLaneExpanded: (laneId: string) => void;
}) {
  const indentPx = 8 + lane.depth * 12;
  const zebra =
    index % 2 === 0 ? "bg-timeline-lane" : "bg-timeline-lane-alt";
  const rowInnerClass = cn(
    "flex h-full min-h-0 min-w-0 w-full max-w-full items-center gap-2 py-2 pr-2 text-left",
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
      <span className="min-w-0 w-0 flex-1 text-xs leading-snug text-foreground [overflow-wrap:anywhere]">
        {lane.name}
      </span>
    </>
  );

  return (
    <div
      className={cn("min-h-0 min-w-0 border-b border-border", zebra)}
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
        <div className={rowInnerClass} style={{ paddingLeft: indentPx }}>
          {labelBlock}
        </div>
      )}
    </div>
  );
});

function TimelineLaneSidebarBlockInner<
  Data = unknown,
  TLaneMeta = unknown,
>({
  toggleLaneExpanded,
}: {
  toggleLaneExpanded: (laneId: string) => void;
}) {
  const { screenXToContainerX } = useTimelineRefs();
  const visibleLaneRows = useTimelineVisibleLaneRows<TLaneMeta>();
  const mergedItems = useTimelineMergedItems<Data>();
  const verticalScrollOffset = useTimelineVerticalScrollOffset();
  const scrollOffset = useTimelineScrollOffset();
  const zoom = useTimelineZoom();
  const dragState = useTimelineDragState<Data>();
  const snapTime = useTimelineSnapTime();
  const currentMouseX = useTimelineCurrentMouseX();

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
      ),
    [
      currentMouseX,
      dragState,
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
      style={{ width: SIDEBAR_WIDTH }}
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
          );
          return (
            <TimelineLaneSidebarRow
              key={lane.id}
              lane={lane}
              index={index}
              rowHeight={rowHeight}
              toggleLaneExpanded={toggleLaneExpanded}
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
