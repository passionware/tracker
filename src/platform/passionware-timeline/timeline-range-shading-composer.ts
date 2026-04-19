import type {
  TimelineRangeShadingState,
  TimelineTimeRangeShadowViewport,
} from "./timeline-infinite-types.ts";
import {
  type TimelineTemporal,
  timelineTemporalToZoned,
  zonedDateTimeToMinutes,
} from "./passionware-timeline-core.ts";
import {
  composeRangeLayersToPaintSegments,
  minuteRangesFromViewportShadow,
  TIMELINE_RANGE_LAYER_PRIORITY,
  type TimelineRangePaintLayer,
} from "./timeline-range-layer-compose.ts";
import { unionMinuteRanges } from "./timeline-minute-range-set.ts";
import { createDefaultTimelineViewportShadows } from "./timeline-time-range-shadow-presets.ts";

/** Default Tailwind classes for night/weekend/clamp viewport bands. */
export const DEFAULT_TIMELINE_RANGE_SHADING_VISUAL = {
  night: "bg-zinc-900/5",
  weekend: "bg-sky-800/15",
  clamp: "bg-zinc-500/20",
} as const;

/**
 * Reusable night + weekend viewport shadows from toolbar / preference state.
 * Callers prepend these before fixed shadows (e.g. outside-range clamps) so clamps paint on top.
 *
 * @deprecated Prefer {@link createComposedRangeShadow}, which composes night + weekend + clamp into
 * a single occlusion-aware viewport shadow. Concatenating these with `createOutsideRangeShadows`
 * results in stacked translucent rectangles instead of mutual occlusion.
 */
export function nightWeekendViewportShadowsForShadingState(
  state: TimelineRangeShadingState,
  classes: {
    night: string;
    weekend: string;
  } = DEFAULT_TIMELINE_RANGE_SHADING_VISUAL,
): TimelineTimeRangeShadowViewport[] {
  return createDefaultTimelineViewportShadows({
    includeNightHours: state.night,
    includeWeekend: state.weekend,
    nightHoursClassName: classes.night,
    weekendClassName: classes.weekend,
  });
}

/** Open-ended clamp range. `null` ends extend to ±∞ (clipped to the visible viewport). */
export type TimelineRangeShadowClamp = {
  start: TimelineTemporal | null;
  end: TimelineTemporal | null;
};

export type ComposedRangeShadowOptions = {
  /**
   * When provided, dim everything outside `[start, end]` with `classes.clamp`. The clamp wins over
   * weekend and night, so weekend/night bands are not painted inside the clamped area.
   */
  clamp?: TimelineRangeShadowClamp | null;
  /** Toggle visibility of weekend / night bands (typically driven by toolbar preferences). */
  rangeShadingState: TimelineRangeShadingState;
  /** Override one or more class names for the bands. */
  classes?: {
    night?: string;
    weekend?: string;
    clamp?: string;
  };
  /**
   * Forwarded to {@link createDefaultTimelineViewportShadows} — hide the weekend layer below the
   * given px-per-day. Defaults to the preset value when omitted.
   */
  minPixelsPerDayForWeekend?: number;
};

/**
 * Single occlusion-aware viewport shadow for `clamp > weekend > night`. Use this in place of
 * concatenating `nightWeekendViewportShadowsForShadingState` and `createOutsideRangeShadows` —
 * those stack independently and produce visible overlap.
 */
export function createComposedRangeShadow(
  options: ComposedRangeShadowOptions,
): TimelineTimeRangeShadowViewport {
  const nightClass =
    options.classes?.night ?? DEFAULT_TIMELINE_RANGE_SHADING_VISUAL.night;
  const weekendClass =
    options.classes?.weekend ?? DEFAULT_TIMELINE_RANGE_SHADING_VISUAL.weekend;
  const clampClass =
    options.classes?.clamp ?? DEFAULT_TIMELINE_RANGE_SHADING_VISUAL.clamp;

  const nightShadow = options.rangeShadingState.night
    ? createDefaultTimelineViewportShadows({
        includeNightHours: true,
        includeWeekend: false,
        nightHoursClassName: nightClass,
      })[0]
    : undefined;
  const weekendShadow = options.rangeShadingState.weekend
    ? createDefaultTimelineViewportShadows({
        includeNightHours: false,
        includeWeekend: true,
        weekendClassName: weekendClass,
        minPixelsPerDayForWeekend: options.minPixelsPerDayForWeekend,
      })[0]
    : undefined;

  return {
    kind: "viewport",
    resolve(ctx) {
      const lo = Math.min(ctx.visibleStartMinutes, ctx.visibleEndMinutes);
      const hi = Math.max(ctx.visibleStartMinutes, ctx.visibleEndMinutes);
      const layers: TimelineRangePaintLayer[] = [];

      if (options.clamp) {
        const clampStartMin =
          options.clamp.start != null
            ? zonedDateTimeToMinutes(
                timelineTemporalToZoned(options.clamp.start, ctx.timeZone),
                ctx.baseDateZoned,
              )
            : Number.NEGATIVE_INFINITY;
        const clampEndMin =
          options.clamp.end != null
            ? zonedDateTimeToMinutes(
                timelineTemporalToZoned(options.clamp.end, ctx.timeZone),
                ctx.baseDateZoned,
              )
            : Number.POSITIVE_INFINITY;
        const clampRanges = unionMinuteRanges([
          { start: lo, end: Math.min(clampStartMin, hi) },
          { start: Math.max(clampEndMin, lo), end: hi },
        ]);
        if (clampRanges.length > 0) {
          layers.push({
            id: "clamp",
            priority: TIMELINE_RANGE_LAYER_PRIORITY.clamp,
            className: clampClass,
            ranges: clampRanges,
          });
        }
      }

      const weekendRaw = minuteRangesFromViewportShadow(weekendShadow, ctx);
      if (weekendRaw.length > 0) {
        layers.push({
          id: "weekend",
          priority: TIMELINE_RANGE_LAYER_PRIORITY.weekend,
          className: weekendClass,
          ranges: weekendRaw,
        });
      }

      const nightRaw = minuteRangesFromViewportShadow(nightShadow, ctx);
      if (nightRaw.length > 0) {
        layers.push({
          id: "night",
          priority: TIMELINE_RANGE_LAYER_PRIORITY.night,
          className: nightClass,
          ranges: nightRaw,
        });
      }

      return composeRangeLayersToPaintSegments(layers);
    },
  };
}
