"use client";

import { TimelineMilestoneDiamond } from "@/features/_common/patterns/TimelineMilestoneDiamond.tsx";
import type { DefaultTimelineItemProps } from "@/platform/passionware-timeline/timeline-default-item.tsx";
import {
  SIDEBAR_WIDTH,
  timelineTemporalRangeToLayoutMinutes,
} from "@/platform/passionware-timeline/passionware-timeline-core.ts";
import { layoutTimeToPixel } from "@/platform/passionware-timeline/timeline-layout-logic.ts";
import { pixelsPerMinuteFromZoom } from "@/platform/passionware-timeline/timeline-view-geometry.ts";
import {
  useTimelineBaseDateZoned,
  useTimelineScrollOffset,
  useTimelineZoom,
} from "@/platform/passionware-timeline/use-timeline-selectors.ts";
import { useMemo } from "react";
import type { ProjectTimelineItemData } from "./projectTimelineModel.ts";

type Props = DefaultTimelineItemProps<ProjectTimelineItemData>;

/**
 * Cost instant on the timeline; hovering the diamond shows green washes for every linked report’s
 * calendar period on this lane.
 */
export function ProjectTimelineCostMarker(props: Props) {
  const d = props.item.data;
  if (d.kind !== "cost") {
    return null;
  }

  const baseDateZoned = useTimelineBaseDateZoned();
  const scrollOffset = useTimelineScrollOffset();
  const zoom = useTimelineZoom();

  const diamondHoverBands = useMemo(() => {
    const trackH = props.laneTrackHeightPx;
    if (trackH == null || trackH <= 0 || d.linkedReportPeriods.length === 0) {
      return undefined;
    }
    const timeToPixel = (t: number) => layoutTimeToPixel(t, scrollOffset, zoom);
    const ppm = pixelsPerMinuteFromZoom(zoom);
    const bands = d.linkedReportPeriods.map((p) => {
      const { startMinutes, endMinutes } = timelineTemporalRangeToLayoutMinutes(
        p.periodStart,
        p.periodEnd,
        baseDateZoned.timeZone,
        baseDateZoned,
      );
      const bandLeft = timeToPixel(startMinutes) - SIDEBAR_WIDTH;
      const naturalW = (endMinutes - startMinutes) * ppm;
      const bandWidth = Math.max(naturalW, 3);
      return {
        bandLeft,
        bandWidth,
        trackHeightPx: trackH,
      };
    });
    return bands;
  }, [
    baseDateZoned,
    d.linkedReportPeriods,
    props.laneTrackHeightPx,
    scrollOffset,
    zoom,
  ]);

  return (
    <TimelineMilestoneDiamond
      {...props}
      diamondHoverBands={diamondHoverBands}
    />
  );
}
