import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import type {
  DrawingPreviewLabelParams,
  TimelineItem,
} from "./passionware-timeline-core.ts";
import type { VisibleTimelineLaneRow } from "./timeline-lane-tree.ts";
import type { TimelineStateApi } from "./use-timeline-state.ts";
import type { UseTimelineInteractionsOptions } from "./use-timeline-interactions.ts";

export interface InfiniteTimelineProps<Data = unknown, TLaneMeta = unknown> {
  state: TimelineStateApi<Data, TLaneMeta>;
  interactionOptions?: UseTimelineInteractionsOptions<Data>;
  renderItem?: (props: {
    item: TimelineItem<Data>;
    left: number;
    width: number;
    isSelected: boolean;
    selected: boolean;
    isMinWidth: boolean;
    /** Resolved lane track height for this item’s lane (for full-height custom content). */
    laneTrackHeightPx?: number;
    onMouseDown: (
      e: ReactMouseEvent,
      item: TimelineItem<Data>,
      type: "move" | "resize-start" | "resize-end",
    ) => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onClick?: (e: ReactMouseEvent, item: TimelineItem<Data>) => void;
  }) => ReactNode;
  onItemHover?: (item: TimelineItem<Data>) => void;
  isEventSelected?: (item: TimelineItem<Data>) => boolean;
  renderDrawingPreviewLabel?: (
    params: DrawingPreviewLabelParams,
    lane: VisibleTimelineLaneRow<TLaneMeta>,
  ) => ReactNode;
}
