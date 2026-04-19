import {
  CalendarDate,
  type ZonedDateTime,
  toZoned,
} from "@internationalized/date";
import { describe, expect, it } from "vitest";
import { zonedDateTimeToMinutes } from "./passionware-timeline-core.ts";
import { createDefaultTimelineViewportShadows } from "./timeline-time-range-shadow-presets.ts";
import type { TimelineViewportRangeContext } from "./timeline-infinite-types.ts";
import type { TimelineTimeScale } from "./timeline-ruler-model.ts";

/** Two full weeks starting Monday 2025-06-02 00:00 UTC (ends at 2025-06-16 00:00 exclusive). */
const TWO_WEEK_MINUTES = 14 * 1440;

function ctxForRange(
  baseDateZoned: ZonedDateTime,
  visibleStartMinutes: number,
  visibleEndMinutes: number,
  rulerTimeScale: TimelineTimeScale,
  pixelsPerMinute = 2,
): TimelineViewportRangeContext {
  return {
    visibleStartMinutes,
    visibleEndMinutes,
    zoom: 1,
    pixelsPerMinute,
    rulerTimeScale,
    timeZone: baseDateZoned.timeZone,
    baseDateZoned,
  };
}

describe("createDefaultTimelineViewportShadows", () => {
  const timeZone = "UTC";
  /** Monday 2025-06-02 00:00 in UTC — aligns with ruler weekday logic (Sun=0 … Sat=6). */
  const baseMonday = toZoned(new CalendarDate(2025, 6, 2), timeZone);

  it("resolves two weeks of night and weekend bands on day ruler scale", () => {
    const [nightShadow, weekendShadow] = createDefaultTimelineViewportShadows({
      nightHoursClassName: "night",
      weekendClassName: "weekend",
      minPixelsPerDayForWeekend: 0,
    });

    const ctx = ctxForRange(baseMonday, 0, TWO_WEEK_MINUTES, "days");

    const nights = nightShadow.resolve(ctx);
    const weekends = weekendShadow.resolve(ctx);

    // Night layer covers EVERY day (morning 0:00-8:00 + evening 21:00-24:00).
    // For [Mon Jun 2 00:00, Mon Jun 16 00:00) the iterator emits up to Jun 17,
    // so we get 14 mornings + 14 evenings = 28 segments
    // (Jun 16 morning starts at the exclusive end and clips to zero; Jun 17 falls outside).
    expect(nights.length).toBe(28);
    expect(weekends.length).toBe(3);

    expect(nights.every((s) => s.className === "night")).toBe(true);
    expect(weekends.every((s) => s.className === "weekend")).toBe(true);

    const morning = 8 * 60;
    const evening = 3 * 60;
    for (const s of nights) {
      expect(s.endMinutes - s.startMinutes).toBeGreaterThan(0);
      expect([morning, evening]).toContain(s.endMinutes - s.startMinutes);
    }

    for (const s of weekends) {
      expect(s.endMinutes - s.startMinutes).toBeGreaterThan(0);
    }

    // Source layers are intentionally NOT exclusive any more — every weekend night
    // is also a "night" segment. The exclusive paint output is produced downstream
    // by composeRangeLayersToPaintSegments (see timeline-range-layer-compose.test.ts).
    const overlapped = nights.some((n) =>
      weekends.some(
        (w) =>
          Math.min(n.endMinutes, w.endMinutes) -
            Math.max(n.startMinutes, w.startMinutes) >
          0,
      ),
    );
    expect(overlapped).toBe(true);
  });

  it("marks no nights when ruler is coarser than day ticks", () => {
    const [nightShadow, weekendShadow] = createDefaultTimelineViewportShadows({
      nightHoursClassName: "night",
      weekendClassName: "weekend",
    });
    const ctx = ctxForRange(baseMonday, 0, TWO_WEEK_MINUTES, "weeks");

    expect(nightShadow.resolve(ctx)).toEqual([]);
    expect(weekendShadow.resolve(ctx).length).toBe(3);
  });

  it("skips weekend bands when minPixelsPerDayForWeekend is above px/day", () => {
    const [, weekendShadow] = createDefaultTimelineViewportShadows({
      weekendClassName: "weekend",
      minPixelsPerDayForWeekend: 10_000,
    });
    const ctx = ctxForRange(baseMonday, 0, TWO_WEEK_MINUTES, "days");
    expect(weekendShadow.resolve(ctx)).toEqual([]);
  });

  it("hides weekend bands by default when day width is below 50px", () => {
    const [, weekendShadow] = createDefaultTimelineViewportShadows({
      weekendClassName: "weekend",
    });
    const lowZoomCtx = ctxForRange(
      baseMonday,
      0,
      TWO_WEEK_MINUTES,
      "days",
      49 / 1440,
    );
    expect(weekendShadow.resolve(lowZoomCtx)).toEqual([]);
  });

  it("keeps night segments inside the visible [lo, hi] window", () => {
    const [nightShadow] = createDefaultTimelineViewportShadows({
      nightHoursClassName: "night",
    });
    const lo = 3 * 1440; // Jun 5 Thu 00:00
    const hi = 10 * 1440; // Jun 12 Thu 00:00
    const ctx = ctxForRange(baseMonday, lo, hi, "hours");

    const nights = nightShadow.resolve(ctx);
    expect(nights.length).toBeGreaterThan(0);
    for (const s of nights) {
      expect(s.startMinutes).toBeGreaterThanOrEqual(Math.min(lo, hi));
      expect(s.endMinutes).toBeLessThanOrEqual(Math.max(lo, hi));
    }
  });

  it("agrees with layout minutes for a fixed weeknight slice (Thu morning)", () => {
    const [nightShadow] = createDefaultTimelineViewportShadows({
      nightHoursClassName: "night",
    });
    const thuMidnight = toZoned(new CalendarDate(2025, 6, 5), timeZone);
    const m0 = zonedDateTimeToMinutes(thuMidnight, baseMonday);
    const m8 = m0 + 8 * 60;
    const ctx = ctxForRange(baseMonday, m0 - 60, m8 + 60, "days");

    const nights = nightShadow.resolve(ctx);
    const morning = nights.find(
      (s) => s.endMinutes - s.startMinutes === 8 * 60 && s.startMinutes >= m0,
    );
    expect(morning).toBeDefined();
    expect(morning!.startMinutes).toBe(m0);
    expect(morning!.endMinutes).toBe(m8);
  });

  it("uses Fri 21:00 -> Mon 08:00 weekend blocks", () => {
    const [, weekendShadow] = createDefaultTimelineViewportShadows({
      weekendClassName: "weekend",
    });
    const ctx = ctxForRange(baseMonday, 0, TWO_WEEK_MINUTES, "days");
    const weekends = weekendShadow.resolve(ctx);

    const fri = toZoned(new CalendarDate(2025, 6, 6), timeZone);
    const mon = toZoned(new CalendarDate(2025, 6, 9), timeZone);
    const fri21 = zonedDateTimeToMinutes(fri, baseMonday) + 21 * 60;
    const mon8 = zonedDateTimeToMinutes(mon, baseMonday) + 8 * 60;

    expect(
      weekends.some((s) => s.startMinutes === fri21 && s.endMinutes === mon8),
    ).toBe(true);
  });
});
