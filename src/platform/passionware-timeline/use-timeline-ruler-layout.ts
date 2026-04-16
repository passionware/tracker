"use client";

import { useCallback, useMemo } from "react";
import {
  getVisibleTimeRange,
  pixelsPerMinuteFromZoom,
} from "./timeline-view-geometry.ts";
import { layoutTimeToPixel } from "./timeline-layout-logic.ts";
import { buildTimelineRulerModel } from "./timeline-ruler-model.ts";
import {
  useTimelineBaseDateZoned,
  useTimelineContainerWidth,
  useTimelineLaneSidebarWidth,
  useTimelineScrollOffset,
  useTimelineTimeZone,
  useTimelineZoom,
} from "./use-timeline-selectors.ts";

export function useTimelineRulerLayout() {
  const baseDateZoned = useTimelineBaseDateZoned();
  const timeZone = useTimelineTimeZone();
  const scrollOffset = useTimelineScrollOffset();
  const zoom = useTimelineZoom();
  const containerWidth = useTimelineContainerWidth();
  const laneSidebarWidthPx = useTimelineLaneSidebarWidth();
  const tracksContentWidth = Math.max(
    0,
    containerWidth - laneSidebarWidthPx,
  );

  const pixelsPerMinute = useMemo(
    () => pixelsPerMinuteFromZoom(zoom),
    [zoom],
  );
  const timeToPixel = useCallback(
    (t: number) =>
      layoutTimeToPixel(t, scrollOffset, zoom, laneSidebarWidthPx),
    [laneSidebarWidthPx, scrollOffset, zoom],
  );

  const { startTime, endTime } = useMemo(
    () =>
      getVisibleTimeRange(
        scrollOffset,
        zoom,
        containerWidth,
        laneSidebarWidthPx,
      ),
    [containerWidth, laneSidebarWidthPx, scrollOffset, zoom],
  );

  const {
    timeScale,
    labelInterval,
    showQuarterLabels,
    hourMarkers,
    quarterMarkers,
    dayMarkers,
    weekMarkers,
    monthMarkers,
    yearMarkers,
    quarterScaleMarkers,
  } = useMemo(
    () =>
      buildTimelineRulerModel(
        startTime,
        endTime,
        zoom,
        baseDateZoned,
        timeZone,
      ),
    [baseDateZoned, endTime, startTime, timeZone, zoom],
  );

  return {
    timeToPixel,
    containerWidth,
    /** Width of the time axis (viewport minus lane sidebar). Use for culling `timeToPixel(t)-SIDEBAR_WIDTH`. */
    tracksContentWidth,
    pixelsPerMinute,
    timeScale,
    labelInterval,
    showQuarterLabels,
    hourMarkers,
    quarterMarkers,
    dayMarkers,
    weekMarkers,
    monthMarkers,
    yearMarkers,
    quarterScaleMarkers,
    baseDateZoned,
    timeZone,
    startTime,
    endTime,
  };
}
