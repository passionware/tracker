import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import type {
  DrawingPreviewLabelParams,
  TimelineItem,
  TimelineTemporal,
} from "./passionware-timeline-core.ts";
import type { VisibleTimelineLaneRow } from "./timeline-lane-tree.ts";
import type { TimelineStateApi } from "./use-timeline-state.ts";
import type { UseTimelineInteractionsOptions } from "./use-timeline-interactions.ts";

/**
 * Paints a horizontal band on the **tracks** (time axis) behind items. Use `start: null` / `end: null`
 * for an open-ended interval on that side (extends far in layout minutes, clipped by the view).
 */
export interface TimelineTimeRangeShadow {
  /** Inclusive-ish layout start; `null` = unbounded past. */
  start: TimelineTemporal | null;
  /** Layout end; `null` = unbounded future. */
  end: TimelineTemporal | null;
  /** Fill classes (e.g. `bg-muted/20`). */
  className: string;
}

export interface InfiniteTimelineProps<Data = unknown, TLaneMeta = unknown> {
  state: TimelineStateApi<Data, TLaneMeta>;
  /**
   * When true, hides the editor toolbar and bottom status bar (e.g. embedded in a popover).
   */
  embedded?: boolean;
  /**
   * Custom lane label (left sidebar). When omitted, {@link VisibleTimelineLaneRow#name} is shown.
   */
  renderLaneLabel?: (lane: VisibleTimelineLaneRow<TLaneMeta>) => ReactNode;
  /**
   * When true, hides lane minimize / expand chrome (flat read-only lanes).
   */
  hideLaneControls?: boolean;
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
  /**
   * Vertical bands on the time axis (painted above lane stripes as a tint, `pointer-events: none`,
   * so items stay interactive).
   */
  timeRangeShadows?: TimelineTimeRangeShadow[];
}
