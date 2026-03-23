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
 * Billing instant on the timeline. **Unpaid** billings also get a semi-transparent red band
 * over the linked iteration’s calendar period (full lane height), behind the diamond.
 */
export function ProjectTimelineBillingMarker(props: Props) {
  const d = props.item.data;
  if (d.kind !== "billing") {
    return null;
  }

  const baseDateZoned = useTimelineBaseDateZoned();
  const scrollOffset = useTimelineScrollOffset();
  const zoom = useTimelineZoom();

  const laneHighlight = useMemo(() => {
    if (!d.unpaid) {
      return undefined;
    }
    const trackH = props.laneTrackHeightPx;
    if (trackH == null || trackH <= 0) {
      return undefined;
    }
    const { startMinutes, endMinutes } = timelineTemporalRangeToLayoutMinutes(
      d.periodStart,
      d.periodEnd,
      baseDateZoned.timeZone,
      baseDateZoned,
    );
    const timeToPixel = (t: number) => layoutTimeToPixel(t, scrollOffset, zoom);
    const ppm = pixelsPerMinuteFromZoom(zoom);
    const bandLeft = timeToPixel(startMinutes) - SIDEBAR_WIDTH;
    const naturalW = (endMinutes - startMinutes) * ppm;
    const bandWidth = Math.max(naturalW, 3);
    return {
      bandLeft,
      bandWidth,
      trackHeightPx: trackH,
    };
  }, [
    baseDateZoned,
    d.periodEnd,
    d.periodStart,
    d.unpaid,
    props.laneTrackHeightPx,
    scrollOffset,
    zoom,
  ]);

  return (
    <TimelineMilestoneDiamond
      {...props}
      variant={d.unpaid ? "billing-unpaid" : "default"}
      laneHighlight={laneHighlight}
    />
  );
}
