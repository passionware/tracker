import type {
  TimelineRangeShadingState,
  TimelineTimeRangeShadowViewport,
} from "./timeline-infinite-types.ts";
import { createDefaultTimelineViewportShadows } from "./timeline-time-range-shadow-presets.ts";

/** Default Tailwind classes for night/weekend viewport bands (match presets). */
export const DEFAULT_TIMELINE_RANGE_SHADING_VISUAL = {
  night: "bg-zinc-900/5",
  weekend: "bg-sky-800/15",
} as const;

/**
 * Reusable night + weekend viewport shadows from toolbar / preference state.
 * Callers prepend these before fixed shadows (e.g. outside-range clamps) so clamps paint on top.
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
