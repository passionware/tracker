import { CalendarDate, toZoned } from "@internationalized/date";
import type { ZonedDateTime } from "@internationalized/date";
import { describe, expect, it } from "vitest";
import { zonedDateTimeToMinutes } from "./passionware-timeline-core.ts";
import { createComposedRangeShadow } from "./timeline-range-shading-composer.ts";
import type { TimelineViewportRangeContext } from "./timeline-infinite-types.ts";
import type { TimelineTimeScale } from "./timeline-ruler-model.ts";

const ONE_WEEK_MINUTES = 7 * 1440;

function ctx(
  baseDateZoned: ZonedDateTime,
  visibleStartMinutes: number,
  visibleEndMinutes: number,
  rulerTimeScale: TimelineTimeScale = "days",
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

describe("createComposedRangeShadow", () => {
  const timeZone = "UTC";
  /** Monday 2025-06-02 00:00 UTC. */
  const baseMonday = toZoned(new CalendarDate(2025, 6, 2), timeZone);
  /** Active iteration: Wed 2025-06-04 00:00 → Mon 2025-06-09 00:00 (covers Fri night + weekend). */
  const clampStart = new CalendarDate(2025, 6, 4);
  const clampEnd = new CalendarDate(2025, 6, 9);

  it("emits paint segments that never overlap each other (clamp > weekend > night)", () => {
    const shadow = createComposedRangeShadow({
      clamp: { start: clampStart, end: clampEnd },
      rangeShadingState: { night: true, weekend: true },
      classes: { night: "night", weekend: "weekend", clamp: "clamp" },
      minPixelsPerDayForWeekend: 0,
    });

    const segs = shadow.resolve(ctx(baseMonday, 0, ONE_WEEK_MINUTES));

    // Pairwise: any two segments must be disjoint in the [start, end) sense.
    for (let i = 0; i < segs.length; i++) {
      for (let j = i + 1; j < segs.length; j++) {
        const a = segs[i];
        const b = segs[j];
        const overlap =
          Math.min(a.endMinutes, b.endMinutes) -
          Math.max(a.startMinutes, b.startMinutes);
        expect(overlap <= 0).toBe(true);
      }
    }

    expect(segs.some((s) => s.className === "clamp")).toBe(true);
    expect(segs.some((s) => s.className === "weekend")).toBe(true);
    expect(segs.some((s) => s.className === "night")).toBe(true);
  });

  it("clamps wipe both weekend and night inside the dimmed area", () => {
    const shadow = createComposedRangeShadow({
      clamp: { start: clampStart, end: clampEnd },
      rangeShadingState: { night: true, weekend: true },
      classes: { night: "night", weekend: "weekend", clamp: "clamp" },
      minPixelsPerDayForWeekend: 0,
    });

    const segs = shadow.resolve(ctx(baseMonday, 0, ONE_WEEK_MINUTES));

    // Active range = Wed 00:00 → Sat 00:00 (Jun 4 -> Jun 7 exclusive).
    const activeStart = zonedDateTimeToMinutes(
      toZoned(clampStart, timeZone),
      baseMonday,
    );
    const activeEnd = zonedDateTimeToMinutes(
      toZoned(clampEnd.add({ days: 1 }), timeZone),
      baseMonday,
    );

    for (const s of segs) {
      if (s.className === "clamp") continue;
      // Weekend / night must lie entirely within the active range.
      expect(s.startMinutes).toBeGreaterThanOrEqual(activeStart);
      expect(s.endMinutes).toBeLessThanOrEqual(activeEnd);
    }
  });

  it("weekend occludes night where they would otherwise overlap (Fri 21:00 carry-over)", () => {
    const shadow = createComposedRangeShadow({
      clamp: null,
      rangeShadingState: { night: true, weekend: true },
      classes: { night: "night", weekend: "weekend" },
      minPixelsPerDayForWeekend: 0,
    });

    const segs = shadow.resolve(ctx(baseMonday, 0, ONE_WEEK_MINUTES));

    // Fri 21:00 → Sat 24:00 belongs to the weekend band; no night segment may live there.
    const friday = new CalendarDate(2025, 6, 6);
    const fri21 =
      zonedDateTimeToMinutes(toZoned(friday, timeZone), baseMonday) + 21 * 60;
    const sun24 =
      zonedDateTimeToMinutes(
        toZoned(friday.add({ days: 3 }), timeZone),
        baseMonday,
      );

    for (const s of segs) {
      if (s.className !== "night") continue;
      const overlap =
        Math.min(s.endMinutes, sun24) - Math.max(s.startMinutes, fri21);
      expect(overlap <= 0).toBe(true);
    }
  });

  it("falls back to clamp-only when range shading is disabled", () => {
    const shadow = createComposedRangeShadow({
      clamp: { start: clampStart, end: clampEnd },
      rangeShadingState: { night: false, weekend: false },
      classes: { clamp: "clamp" },
      minPixelsPerDayForWeekend: 0,
    });

    const segs = shadow.resolve(ctx(baseMonday, 0, ONE_WEEK_MINUTES));
    expect(segs.length).toBeGreaterThan(0);
    expect(segs.every((s) => s.className === "clamp")).toBe(true);
  });
});
