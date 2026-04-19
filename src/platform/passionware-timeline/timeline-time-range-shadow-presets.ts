import {
  CalendarDateTime,
  getDayOfWeek,
  toCalendarDate,
  toZoned,
} from "@internationalized/date";
import {
  minutesToZonedDateTime,
  type TimelineTemporal,
  zonedDateTimeToMinutes,
} from "./passionware-timeline-core.ts";
import type {
  TimelineTimeRangeShadowFixed,
  TimelineTimeRangePaintSegment,
  TimelineTimeRangeShadowViewport,
  TimelineViewportRangeContext,
} from "./timeline-infinite-types.ts";
import { timelineRulerShowsDayTicks } from "./timeline-ruler-model.ts";

function clipSegment(
  a: number,
  b: number,
  lo: number,
  hi: number,
  className: string,
): TimelineTimeRangePaintSegment | null {
  const loM = Math.min(lo, hi);
  const hiM = Math.max(lo, hi);
  const sa = Math.max(Math.min(a, b), loM);
  const sb = Math.min(Math.max(a, b), hiM);
  if (!(sb > sa) || !Number.isFinite(sa) || !Number.isFinite(sb)) return null;
  return { startMinutes: sa, endMinutes: sb, className };
}

function createNightViewportShadow(
  className: string,
): TimelineTimeRangeShadowViewport {
  return {
    kind: "viewport",
    resolve(ctx: TimelineViewportRangeContext): TimelineTimeRangePaintSegment[] {
      if (!timelineRulerShowsDayTicks(ctx.rulerTimeScale)) return [];

      const { baseDateZoned, timeZone, visibleStartMinutes, visibleEndMinutes } =
        ctx;
      const lo = Math.min(visibleStartMinutes, visibleEndMinutes);
      const hi = Math.max(visibleStartMinutes, visibleEndMinutes);

      const zLo = minutesToZonedDateTime(lo, baseDateZoned);
      let cal = toCalendarDate(zLo);
      const calEnd = toCalendarDate(
        minutesToZonedDateTime(hi, baseDateZoned),
      ).add({ days: 1 });

      const out: TimelineTimeRangePaintSegment[] = [];

      // Emit night bands for every day; the weekend layer (higher priority) occludes
      // the weekend portion at composition time. Keep the layer self-consistent —
      // "night" means "21:00 → 08:00 on every day" — so consumers can compose freely.
      for (; cal.compare(calEnd) <= 0; cal = cal.add({ days: 1 })) {
        const m0 = zonedDateTimeToMinutes(toZoned(cal, timeZone), baseDateZoned);
        const m8 = zonedDateTimeToMinutes(
          toZoned(
            new CalendarDateTime(
              cal.calendar,
              cal.era,
              cal.year,
              cal.month,
              cal.day,
              8,
              0,
              0,
            ),
            timeZone,
          ),
          baseDateZoned,
        );
        const m21 = zonedDateTimeToMinutes(
          toZoned(
            new CalendarDateTime(
              cal.calendar,
              cal.era,
              cal.year,
              cal.month,
              cal.day,
              21,
              0,
              0,
            ),
            timeZone,
          ),
          baseDateZoned,
        );
        const mNextMid = zonedDateTimeToMinutes(
          toZoned(cal.add({ days: 1 }), timeZone),
          baseDateZoned,
        );

        const morning = clipSegment(m0, m8, lo, hi, className);
        if (morning) out.push(morning);
        const evening = clipSegment(m21, mNextMid, lo, hi, className);
        if (evening) out.push(evening);
      }

      return out;
    },
  };
}

function createWeekendViewportShadow(
  className: string,
  minPixelsPerDay: number,
): TimelineTimeRangeShadowViewport {
  return {
    kind: "viewport",
    resolve(ctx: TimelineViewportRangeContext): TimelineTimeRangePaintSegment[] {
      const pxPerDay = ctx.pixelsPerMinute * 1440;
      if (minPixelsPerDay > 0 && pxPerDay < minPixelsPerDay) return [];

      const { baseDateZoned, timeZone, visibleStartMinutes, visibleEndMinutes } =
        ctx;
      const lo = Math.min(visibleStartMinutes, visibleEndMinutes);
      const hi = Math.max(visibleStartMinutes, visibleEndMinutes);

      const zLo = minutesToZonedDateTime(lo, baseDateZoned);
      const calLo = toCalendarDate(zLo);
      const calHi = toCalendarDate(minutesToZonedDateTime(hi, baseDateZoned));

      const out: TimelineTimeRangePaintSegment[] = [];

      // One band per week: Fri 21:00 → Mon 08:00 (exclusive), includes Fri/Sat/Sun nights.
      let cal = calLo.subtract({ days: 6 });
      const calStop = calHi.add({ days: 7 });
      for (; cal.compare(calStop) <= 0; cal = cal.add({ days: 1 })) {
        if (getDayOfWeek(cal, "en-US", "sun") !== 5) continue;

        const fri21 = zonedDateTimeToMinutes(
          toZoned(
            new CalendarDateTime(
              cal.calendar,
              cal.era,
              cal.year,
              cal.month,
              cal.day,
              21,
              0,
              0,
            ),
            timeZone,
          ),
          baseDateZoned,
        );
        const monCal = cal.add({ days: 3 });
        const mon8 = zonedDateTimeToMinutes(
          toZoned(
            new CalendarDateTime(
              monCal.calendar,
              monCal.era,
              monCal.year,
              monCal.month,
              monCal.day,
              8,
              0,
              0,
            ),
            timeZone,
          ),
          baseDateZoned,
        );
        const seg = clipSegment(fri21, mon8, lo, hi, className);
        if (seg) out.push(seg);
      }

      return out;
    },
  };
}

export type DefaultTimelineViewportShadowOptions = {
  /**
   * Tailwind classes for night bands (21:00 → 08:00 on every day).
   * The layer covers weekend nights too; rely on `composeRangeLayersToPaintSegments`
   * to let the weekend layer occlude them.
   */
  nightHoursClassName?: string;
  /** Include night bands. Default `true`. */
  includeNightHours?: boolean;
  /** Tailwind classes for weekend bands (Fri 21:00 → Mon 08:00 local). */
  weekendClassName?: string;
  /** Include weekend bands. Default `true`. */
  includeWeekend?: boolean;
  /**
   * When positive, skip weekend bands if one calendar day is narrower than this (px). Default `50`.
   */
  minPixelsPerDayForWeekend?: number;
};

/**
 * Preset viewport shadows: **weekends** (Fri 21:00 → Mon 08:00 local) and **nights** (21:00 → 08:00 every day).
 * Layers may overlap at the source — `composeRangeLayersToPaintSegments` (weekend > night) renders the
 * exclusive paint segments. Night bands render only while the ruler is on **hour** or **day** scale
 * (same condition as day ticks).
 */
export function createDefaultTimelineViewportShadows(
  options?: DefaultTimelineViewportShadowOptions,
): TimelineTimeRangeShadowViewport[] {
  const night = options?.nightHoursClassName ?? "bg-zinc-900/5";
  const weekend = options?.weekendClassName ?? "bg-sky-800/15";
  const includeNightHours = options?.includeNightHours ?? true;
  const includeWeekend = options?.includeWeekend ?? true;
  const out: TimelineTimeRangeShadowViewport[] = [];
  if (includeNightHours) {
    out.push(createNightViewportShadow(night));
  }
  if (includeWeekend) {
    out.push(
      createWeekendViewportShadow(
        weekend,
        options?.minPixelsPerDayForWeekend ?? 50,
      ),
    );
  }
  return out;
}

/** Paints outside `[start, end]` with fixed clamp bands (left and right open-ended ranges). */
export function createOutsideRangeShadows(
  start: TimelineTemporal,
  end: TimelineTemporal,
  className = "bg-zinc-500/20",
): TimelineTimeRangeShadowFixed[] {
  return [
    {
      kind: "fixed",
      start: null,
      end: start,
      className,
    },
    {
      kind: "fixed",
      start: end,
      end: null,
      className,
    },
  ];
}
