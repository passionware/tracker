"use client";

import { useCallback } from "react";
import type { PreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import type { TimelineRangeShadingState } from "./timeline-infinite-types.ts";

/**
 * Binds timeline range-shading toolbar state to {@link PreferenceService} for a stable scope key.
 * Compose resulting night/weekend layers with view-specific shadows via
 * {@link nightWeekendViewportShadowsForShadingState} in the parent.
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
