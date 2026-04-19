import type { ZonedDateTime } from "@internationalized/date";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import type {
  DrawingPreviewLabelParams,
  TimelineItem,
  TimelineTemporal,
} from "./passionware-timeline-core.ts";
import type { VisibleTimelineLaneRow } from "./timeline-lane-tree.ts";
import type { TimelineStateApi } from "./use-timeline-state.ts";
import type { UseTimelineInteractionsOptions } from "./use-timeline-interactions.ts";
import type { TimelineTimeScale } from "./timeline-ruler-model.ts";

/** Layout minutes + styling for one painted band on the tracks. */
export type TimelineTimeRangePaintSegment = {
  startMinutes: number;
  endMinutes: number;
  className: string;
};

/** Passed to {@link TimelineTimeRangeShadowViewport.resolve} (viewport in layout minutes + zoom). */
export type TimelineViewportRangeContext = {
  visibleStartMinutes: number;
  visibleEndMinutes: number;
  zoom: number;
  pixelsPerMinute: number;
  /**
   * Same `timeScale` as {@link buildTimelineRulerModel} for the current viewport (legend resolution).
   * Pair with `timelineRulerShowsDayTicks` from `timeline-ruler-model.ts` when bands should follow day ticks.
   */
  rulerTimeScale: TimelineTimeScale;
  timeZone: string;
  baseDateZoned: ZonedDateTime;
};

/**
 * Fixed band using timeline temporals. `start` / `end` `null` = open-ended (extends far, clipped when painting).
 * Omit `kind` or set `kind: "fixed"` (default).
 */
export type TimelineTimeRangeShadowFixed = {
  kind?: "fixed";
  start: TimelineTemporal | null;
  end: TimelineTemporal | null;
  className: string;
};

/**
 * Viewport-dependent bands: return only segments that intersect the visible span (layout minutes).
 */
export type TimelineTimeRangeShadowViewport = {
  kind: "viewport";
  resolve: (ctx: TimelineViewportRangeContext) => TimelineTimeRangePaintSegment[];
};

export type TimelineTimeRangeShadow =
  | TimelineTimeRangeShadowFixed
  | TimelineTimeRangeShadowViewport;

export type TimelineRangeShadingState = {
  night: boolean;
  weekend: boolean;
};

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
    onPointerDown: (
      e: ReactPointerEvent,
      item: TimelineItem<Data>,
      type: "move" | "resize-start" | "resize-end",
    ) => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onClick?: (
      e: ReactMouseEvent | ReactPointerEvent,
      item: TimelineItem<Data>,
    ) => void;
  }) => ReactNode;
  onItemHover?: (item: TimelineItem<Data>) => void;
  isEventSelected?: (item: TimelineItem<Data>) => boolean;
  renderDrawingPreviewLabel?: (
    params: DrawingPreviewLabelParams,
    lane: VisibleTimelineLaneRow<TLaneMeta>,
  ) => ReactNode;
  /**
   * Vertical bands on the time axis (painted above lane stripes as a tint, `pointer-events: none`,
   * so items stay interactive). Fixed entries use temporals; `kind: "viewport"` entries derive
   * segments from the visible minute span and zoom (e.g. nights only when zoomed in enough).
   */
  timeRangeShadows?: TimelineTimeRangeShadow[];
  /** Controls toolbar range-shading checkboxes (night/weekend). */
  rangeShadingState?: TimelineRangeShadingState;
  /** Called when user toggles toolbar range-shading checkboxes. */
  onRangeShadingStateChange?: (next: TimelineRangeShadingState) => void;
}
