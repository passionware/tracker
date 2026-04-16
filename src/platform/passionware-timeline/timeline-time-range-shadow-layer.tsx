"use client";

import type { ZonedDateTime } from "@internationalized/date";
import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  timelineTemporalToZoned,
  zonedDateTimeToMinutes,
  type TimelineTemporal,
} from "./passionware-timeline-core.ts";
import type { TimelineTimeRangeShadow } from "./timeline-infinite-types.ts";
import { useTimelineRulerLayout } from "./use-timeline-ruler-layout.ts";
import { useTimelineLaneSidebarWidth } from "./use-timeline-selectors.ts";

/** Enough layout minutes to approximate ±∞ without blowing pixel math. */
const OPEN_RANGE_MINUTES = 10 * 365 * 24 * 60;

function toLayoutMinutes(
  temporal: TimelineTemporal,
  timeZone: string,
  base: ZonedDateTime,
): number {
  const z = timelineTemporalToZoned(temporal, timeZone);
  return zonedDateTimeToMinutes(z, base);
}

function resolvePaintRange(
  shadow: TimelineTimeRangeShadow,
  timeZone: string,
  base: ZonedDateTime,
  visLo: number,
  visHi: number,
): { a: number; b: number } | null {
  if (shadow.start == null && shadow.end == null) return null;

  let a: number;
  let b: number;

  if (shadow.start == null) {
    if (shadow.end == null) return null;
    b = toLayoutMinutes(shadow.end, timeZone, base);
    a = b - OPEN_RANGE_MINUTES;
  } else if (shadow.end == null) {
    a = toLayoutMinutes(shadow.start, timeZone, base);
    b = a + OPEN_RANGE_MINUTES;
  } else {
    a = toLayoutMinutes(shadow.start, timeZone, base);
    b = toLayoutMinutes(shadow.end, timeZone, base);
  }

  if (a >= b) return null;

  const pad = Math.max(1440 * 14, (visHi - visLo) * 3);
  const drawA = Math.max(a, visLo - pad);
  const drawB = Math.min(b, visHi + pad);
  if (drawA >= drawB) return null;
  return { a: drawA, b: drawB };
}

export const TimelineTimeRangeShadowLayer = memo(function TimelineTimeRangeShadowLayer({
  shadows,
  totalHeight,
}: {
  shadows: TimelineTimeRangeShadow[] | undefined;
  totalHeight: number;
}) {
  const { timeToPixel, baseDateZoned, timeZone, startTime, endTime } =
    useTimelineRulerLayout();
  const laneSidebarWidthPx = useTimelineLaneSidebarWidth();

  const rects = useMemo(() => {
    if (!shadows?.length) return [];
    const out: { left: number; width: number; className: string }[] = [];
    for (const s of shadows) {
      const range = resolvePaintRange(
        s,
        timeZone,
        baseDateZoned,
        startTime,
        endTime,
      );
      if (!range) continue;
      const leftRaw = timeToPixel(range.a) - laneSidebarWidthPx;
      const rightRaw = timeToPixel(range.b) - laneSidebarWidthPx;
      const left = Math.min(leftRaw, rightRaw);
      const width = Math.abs(rightRaw - leftRaw);
      if (!Number.isFinite(width) || width <= 0) continue;
      out.push({ left, width, className: s.className });
    }
    return out;
  }, [
    shadows,
    baseDateZoned,
    timeZone,
    startTime,
    endTime,
    timeToPixel,
    laneSidebarWidthPx,
  ]);

  if (rects.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-[1]"
      style={{ height: totalHeight }}
    >
      {rects.map((r, i) => (
        <div
          key={`${r.left}-${r.width}-${r.className}-${i}`}
          className={cn("absolute top-0 h-full", r.className)}
          style={{ left: r.left, width: r.width }}
        />
      ))}
    </div>
  );
});
