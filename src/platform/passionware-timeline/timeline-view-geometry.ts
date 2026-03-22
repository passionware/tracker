import {
  HEADER_HEIGHT,
  PIXELS_PER_MINUTE,
  SIDEBAR_WIDTH,
} from "./passionware-timeline-core.ts";

export function pixelsPerMinuteFromZoom(zoom: number): number {
  return PIXELS_PER_MINUTE * zoom;
}

export function timeToPixel(
  time: number,
  scrollOffset: number,
  zoom: number,
): number {
  return time * pixelsPerMinuteFromZoom(zoom) + scrollOffset + SIDEBAR_WIDTH;
}

export function pixelToTime(
  pixel: number,
  scrollOffset: number,
  zoom: number,
): number {
  return (
    (pixel - SIDEBAR_WIDTH - scrollOffset) / pixelsPerMinuteFromZoom(zoom)
  );
}

export function getVisibleTimeRange(
  scrollOffset: number,
  zoom: number,
  containerWidth: number,
): { startTime: number; endTime: number } {
  const ppm = pixelsPerMinuteFromZoom(zoom);
  const startTime = Math.floor(-scrollOffset / ppm) - 60;
  const endTime = Math.ceil((containerWidth - scrollOffset) / ppm) + 60;
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
