"use client";

import { useCallback } from "react";
import type { PreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import type { TimelineRangeShadingState } from "./timeline-infinite-types.ts";

/**
 * Binds timeline range-shading toolbar state to {@link PreferenceService} for a stable scope key.
 * Pass the resulting `rangeShadingState` to {@link createComposedRangeShadow} in the parent so
 * weekend/night/clamp bands occlude each other instead of stacking translucently.
 */
export function useTimelineRangeShadingFromPreference(
  preferenceService: PreferenceService,
  scopeKey: string,
  defaults: TimelineRangeShadingState,
): {
  rangeShadingState: TimelineRangeShadingState;
  onRangeShadingStateChange: (next: TimelineRangeShadingState) => void;
} {
  const rangeShadingState = preferenceService.useTimelineRangeShading(
    scopeKey,
    defaults,
  );
  const onRangeShadingStateChange = useCallback(
    (next: TimelineRangeShadingState) => {
      void preferenceService.setTimelineRangeShading(scopeKey, next);
    },
    [preferenceService, scopeKey],
  );
  return { rangeShadingState, onRangeShadingStateChange };
}
