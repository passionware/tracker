import {
  HEADER_HEIGHT,
  PIXELS_PER_MINUTE,
  RULER_TRACK_OVERFLOW_PX,
  SIDEBAR_WIDTH,
  TIMELINE_ZOOM_MIN,
} from "./passionware-timeline-core.ts";

/**
 * Pixels per layout minute. Never returns 0 or NaN — a 0 zoom (e.g. autofit when the viewport is
 * narrower than the lane sidebar) would divide by zero in {@link getVisibleTimeRange} and yield
 * ±Infinity minutes, breaking `fromAbsolute` / `Intl` in the ruler.
 */
export function pixelsPerMinuteFromZoom(zoom: number): number {
  const ppm = PIXELS_PER_MINUTE * zoom;
  const floor = PIXELS_PER_MINUTE * TIMELINE_ZOOM_MIN;
  if (!Number.isFinite(ppm) || ppm <= 0) {
    return floor;
  }
  return ppm;
}

export function timeToPixel(
  time: number,
  scrollOffset: number,
  zoom: number,
  laneSidebarWidthPx: number = SIDEBAR_WIDTH,
): number {
  return (
    time * pixelsPerMinuteFromZoom(zoom) + scrollOffset + laneSidebarWidthPx
  );
}

export function pixelToTime(
  pixel: number,
  scrollOffset: number,
  zoom: number,
  laneSidebarWidthPx: number = SIDEBAR_WIDTH,
): number {
  return (
    (pixel - laneSidebarWidthPx - scrollOffset) / pixelsPerMinuteFromZoom(zoom)
  );
}

/**
 * Visible time span for the **tracks** region (right of the fixed lane sidebar), extended by
 * {@link RULER_TRACK_OVERFLOW_PX} so ruler ticks exist for partially visible centered labels.
 * `containerWidth` is the scroll surface width; time is laid out from pixel `SIDEBAR_WIDTH`.
 */
export function getVisibleTimeRange(
  scrollOffset: number,
  zoom: number,
  containerWidth: number,
  laneSidebarWidthPx: number = SIDEBAR_WIDTH,
): { startTime: number; endTime: number } {
  const ppm = pixelsPerMinuteFromZoom(zoom);
  const tracksWidth = Math.max(0, containerWidth - laneSidebarWidthPx);
  const m = RULER_TRACK_OVERFLOW_PX;
  const startTime = Math.floor((-m - scrollOffset) / ppm);
  const endTime = Math.ceil((tracksWidth + m - scrollOffset) / ppm);
  return { startTime, endTime };
}

/** Pixel-like wheel deltas for consistent pan/zoom across mice, trackpads, and deltaMode. */
export function normalizeWheelDeltaPixels(
  e: WheelEvent,
  axis: "x" | "y",
  containerWidth: number,
  containerHeight: number,
): number {
  const raw = axis === "x" ? e.deltaX : e.deltaY;
  switch (e.deltaMode) {
    case WheelEvent.DOM_DELTA_LINE:
      return raw * 16;
    case WheelEvent.DOM_DELTA_PAGE:
      return raw * (axis === "x" ? containerWidth : containerHeight);
    case WheelEvent.DOM_DELTA_PIXEL:
    default:
      return raw;
  }
}

export function verticalScrollMaxOffset(
  totalLaneContentHeight: number,
  containerHeight: number,
): number {
  return Math.max(0, totalLaneContentHeight - containerHeight + HEADER_HEIGHT);
}
