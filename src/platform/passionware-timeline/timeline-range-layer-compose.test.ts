import { describe, expect, it } from "vitest";
import {
  composeRangeLayersToPaintSegments,
  TIMELINE_RANGE_LAYER_PRIORITY,
  timelineRangeAlgebra,
  type TimelineRangePaintLayer,
} from "./timeline-range-layer-compose.ts";

describe("composeRangeLayersToPaintSegments", () => {
  it("higher priority occludes lower where raw ranges overlap", () => {
    const hi = TIMELINE_RANGE_LAYER_PRIORITY.clamp;
    const lo = TIMELINE_RANGE_LAYER_PRIORITY.night;
    const layers: TimelineRangePaintLayer[] = [
      {
        id: "night",
        priority: lo,
        className: "night",
        ranges: [{ start: 0, end: 100 }],
      },
      {
        id: "clamp",
        priority: hi,
        className: "clamp",
        ranges: [{ start: 40, end: 60 }],
      },
    ];
    const segs = composeRangeLayersToPaintSegments(layers);
    expect(segs).toEqual([
      { startMinutes: 0, endMinutes: 40, className: "night" },
      { startMinutes: 60, endMinutes: 100, className: "night" },
      { startMinutes: 40, endMinutes: 60, className: "clamp" },
    ]);
  });

  it("clamp wipes both weekend and night where they overlap", () => {
    const layers: TimelineRangePaintLayer[] = [
      {
        id: "night",
        priority: TIMELINE_RANGE_LAYER_PRIORITY.night,
        className: "night",
        // Two consecutive nights: 21:00 → next 08:00 each.
        ranges: [
          { start: 0, end: 8 * 60 },
          { start: 21 * 60, end: 32 * 60 },
        ],
      },
      {
        id: "weekend",
        priority: TIMELINE_RANGE_LAYER_PRIORITY.weekend,
        className: "weekend",
        // Weekend band straddles part of both nights.
        ranges: [{ start: 4 * 60, end: 30 * 60 }],
      },
      {
        id: "clamp",
        priority: TIMELINE_RANGE_LAYER_PRIORITY.clamp,
        className: "clamp",
        // Clamp wipes everything before 02:00 and after 28:00.
        ranges: [
          { start: 0, end: 2 * 60 },
          { start: 28 * 60, end: 32 * 60 },
        ],
      },
    ];

    const segs = composeRangeLayersToPaintSegments(layers);

    // No weekend/night segment may overlap the clamped regions.
    for (const s of segs) {
      if (s.className === "clamp") continue;
      const inLeftClamp = s.startMinutes < 2 * 60;
      const inRightClamp = s.endMinutes > 28 * 60;
      expect(inLeftClamp).toBe(false);
      expect(inRightClamp).toBe(false);
    }

    // No night segment may overlap the weekend band (weekend wins night).
    for (const s of segs) {
      if (s.className !== "night") continue;
      const overlap =
        Math.min(s.endMinutes, 30 * 60) - Math.max(s.startMinutes, 4 * 60);
      expect(overlap <= 0).toBe(true);
    }

    // The exact composed slices.
    expect(segs).toEqual([
      // night = source ∖ (clamp ∪ weekend) = [02:00, 04:00)
      { startMinutes: 2 * 60, endMinutes: 4 * 60, className: "night" },
      // weekend = source ∖ clamp = [04:00, 28:00)
      { startMinutes: 4 * 60, endMinutes: 28 * 60, className: "weekend" },
      // clamp paints last so it visually covers the source weekend/night underneath.
      { startMinutes: 0, endMinutes: 2 * 60, className: "clamp" },
      { startMinutes: 28 * 60, endMinutes: 32 * 60, className: "clamp" },
    ]);
  });

  it("timelineRangeAlgebra.composeByPriority matches compose export", () => {
    const layers: TimelineRangePaintLayer[] = [
      {
        id: "a",
        priority: 1,
        className: "a",
        ranges: [{ start: 0, end: 10 }],
      },
    ];
    expect(timelineRangeAlgebra.composeByPriority(layers)).toEqual(
      composeRangeLayersToPaintSegments(layers),
    );
  });
});
