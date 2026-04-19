import type {
  TimelineTimeRangePaintSegment,
  TimelineTimeRangeShadowViewport,
  TimelineViewportRangeContext,
} from "./timeline-infinite-types.ts";
import type { TimelineMinuteRange } from "./timeline-minute-range-set.ts";
import {
  differenceMinuteRanges,
  unionMinuteRanges,
} from "./timeline-minute-range-set.ts";

/** Higher number paints above lower (wins overlaps in composition). */
export const TIMELINE_RANGE_LAYER_PRIORITY = {
  clamp: 100,
  weekend: 50,
  night: 10,
} as const;

/**
 * One logical shadow producer: raw `[start, end)` minute ranges (may overlap other producers).
 * Priority decides occlusion when composed with {@link composeRangeLayersToPaintSegments}.
 */
export type TimelineRangePaintLayer = {
  id: string;
  priority: number;
  className: string;
  ranges: TimelineMinuteRange[];
};

/**
 * Union of resolved segments from a single viewport shadow resolver (no cross-shadow algebra).
 */
export function minuteRangesFromViewportShadow(
  shadow: TimelineTimeRangeShadowViewport | undefined,
  ctx: TimelineViewportRangeContext,
): TimelineMinuteRange[] {
  if (shadow == null || shadow.kind !== "viewport") return [];
  return unionMinuteRanges(
    shadow.resolve(ctx).map((seg) => ({
      start: seg.startMinutes,
      end: seg.endMinutes,
    })),
  );
}

/**
 * Higher `priority` wins overlaps: each layer paints `union(ranges) \\ union(higher layers' raw ranges)`.
 */
export function composeRangeLayersToPaintSegments(
  layers: TimelineRangePaintLayer[],
): TimelineTimeRangePaintSegment[] {
  const sortedDesc = [...layers].sort((a, b) => b.priority - a.priority);
  let blocked: TimelineMinuteRange[] = [];
  const perLayerPaint: {
    layer: TimelineRangePaintLayer;
    paint: TimelineMinuteRange[];
  }[] = [];

  for (const layer of sortedDesc) {
    const rawU = unionMinuteRanges(layer.ranges);
    if (rawU.length === 0) continue;
    const paint = differenceMinuteRanges(rawU, blocked);
    perLayerPaint.push({ layer, paint });
    blocked = unionMinuteRanges([...blocked, ...rawU]);
  }

  // Emit lower-priority layers first so higher-priority rects paint later (on top),
  // but keep each layer's sub-segments in ascending startMinutes order.
  const out: TimelineTimeRangePaintSegment[] = [];
  for (let i = perLayerPaint.length - 1; i >= 0; i--) {
    const { layer, paint } = perLayerPaint[i];
    for (const r of paint) {
      out.push({
        startMinutes: r.start,
        endMinutes: r.end,
        className: layer.className,
      });
    }
  }
  return out;
}

/** Named entry points for range math used when composing timeline shadows. */
export const timelineRangeAlgebra = {
  union: unionMinuteRanges,
  difference: differenceMinuteRanges,
  composeByPriority: composeRangeLayersToPaintSegments,
} as const;
