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
