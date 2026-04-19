"use client";

import { Provider } from "jotai";
import type { Lane } from "./timeline-lane-tree.ts";
import type { TimelineItem } from "./passionware-timeline-core.ts";
import type { UseTimelineInteractionsOptions } from "./use-timeline-interactions.ts";
import { TimelineStoreProvider } from "./timeline-store-context.tsx";
import type { InfiniteTimelineProps } from "./timeline-infinite-types.ts";
import { TimelineInfiniteRoot } from "./timeline-infinite-view.tsx";
import {
  useTimelineState,
  type UseTimelineStateOptions,
} from "./use-timeline-state.ts";
import { useSyncTimelineAtoms } from "./use-sync-timeline-atoms.ts";

export {
  useTimelineState,
  type TimelineStateApi,
  type UseTimelineStateOptions,
  type TimelineJotaiBundle,
} from "./use-timeline-state.ts";
export {
  useSyncTimelineAtoms,
  type SyncTimelineAtomsInput,
} from "./use-sync-timeline-atoms.ts";

export type {
  UseTimelineInteractionsOptions,
  UseTimelineInteractionsParams,
} from "./use-timeline-interactions.ts";
export { useTimelineInteractions } from "./use-timeline-interactions.ts";

export type {
  TimelineItem,
  TimelineTemporal,
  DrawingPreviewLabelParams,
} from "./passionware-timeline-core.ts";
export type {
  CalendarDate,
  CalendarDateTime,
  ZonedDateTime,
} from "@internationalized/date";
export {
  defaultTimelineBaseZoned,
  timelineTemporalRangeToLayoutMinutes,
  timelineTemporalToZoned,
  timelineZonedNow,
} from "./passionware-timeline-core.ts";
export type { Lane, VisibleTimelineLaneRow } from "./timeline-lane-tree.ts";

export { TimelineStoreProvider, useTimelineStore } from "./timeline-store-context.tsx";
export {
  TimelineRefsProvider,
  useTimelineRefs,
} from "./timeline-refs-context.tsx";
export {
  TimelineInteractionBridge,
  useTimelineHandlersRef,
} from "./timeline-handlers-ref-context.tsx";
export { TimelineInfiniteRoot } from "./timeline-infinite-view.tsx";
export type {
  InfiniteTimelineProps,
  TimelineRangeShadingState,
  TimelineTimeRangePaintSegment,
  TimelineTimeRangeShadow,
  TimelineTimeRangeShadowFixed,
  TimelineTimeRangeShadowViewport,
  TimelineViewportRangeContext,
} from "./timeline-infinite-types.ts";
export {
  createDefaultTimelineViewportShadows,
  createOutsideRangeShadows,
  type DefaultTimelineViewportShadowOptions,
} from "./timeline-time-range-shadow-presets.ts";
export {
  DEFAULT_TIMELINE_RANGE_SHADING_VISUAL,
  createComposedRangeShadow,
  nightWeekendViewportShadowsForShadingState,
  type ComposedRangeShadowOptions,
  type TimelineRangeShadowClamp,
} from "./timeline-range-shading-composer.ts";
export {
  composeRangeLayersToPaintSegments,
  minuteRangesFromViewportShadow,
  TIMELINE_RANGE_LAYER_PRIORITY,
  timelineRangeAlgebra,
  type TimelineRangePaintLayer,
} from "./timeline-range-layer-compose.ts";
export { useTimelineRangeShadingFromPreference } from "./use-timeline-range-shading-preference.ts";
export {
  timelineRulerShowsDayTicks,
  type TimelineTimeScale,
} from "./timeline-ruler-model.ts";
export {
  useSetTimelineTool,
  useSetTimelineSnapOption,
  useSetTimelineZoom,
  useTimelineBaseDateZoned,
  useTimelineContainerWidth,
  useTimelineCurrentMouseX,
  useTimelineDragState,
  useTimelineEventIds,
  useTimelineHorizontalAxis,
  useTimelineMergedItem,
  useTimelineInternalItems,
  useTimelineMergedItems,
  useTimelinePanState,
  useTimelinePointerZonedTime,
  useTimelineScrollOffset,
  useTimelineSelectedItemId,
  useTimelineSnapOption,
  useTimelineSnapTime,
  useTimelineTool,
  useTimelineTimeZone,
  useTimelineVerticalScrollOffset,
  useTimelineVisibleLaneRows,
  useTimelineZoom,
  useViewportStartDate,
  useViewportVisibleMinutesRange,
  useTimelineItemsForTimelineCount,
  useTimelineMinimizedLaneIds,
} from "./use-timeline-selectors.ts";
export { useTimelineRulerLayout } from "./use-timeline-ruler-layout.ts";
export type { TimelineHorizontalAxisApi } from "./use-timeline-selectors.ts";
export type { JotaiVanillaStore } from "./timeline-jotai-atoms.ts";

export { DefaultTimelineItem } from "./timeline-default-item.tsx";
export type { DefaultTimelineItemProps } from "./timeline-default-item.tsx";

export type { SnapOption } from "./passionware-timeline-core.ts";

export type InfiniteTimelineWithStateProps<
  Data,
  TLaneMeta = unknown,
> = Pick<
  UseTimelineStateOptions<Data, TLaneMeta>,
  "onExpandedLaneIdsChange" | "defaultExpandedLaneIds" | "defaultSnapOption"
> & {
  items: TimelineItem<Data>[];
  lanes?: Lane<TLaneMeta>[];
  timeZone?: string;
  expandedLaneIds?: ReadonlySet<string> | null;
} & UseTimelineInteractionsOptions<Data> &
  Omit<InfiniteTimelineProps<Data, TLaneMeta>, "state" | "interactionOptions">;

/**
 * Convenience: `useTimelineState` + `useSyncTimelineAtoms` + `InfiniteTimeline`.
 * For full control, call `useTimelineState` and `useSyncTimelineAtoms` yourself next to your data source.
 */
export function InfiniteTimelineWithState<Data = unknown, TLaneMeta = unknown>({
  items,
  lanes,
  timeZone,
  expandedLaneIds,
  defaultExpandedLaneIds,
  onExpandedLaneIdsChange,
  defaultSnapOption,
  onItemsChange,
  onDrawComplete,
  onItemClick,
  onEventSelect,
  onRangeSelect,
  onEscapeSelection,
  itemActivateTrigger,
  viewportRange,
  renderItem,
  onItemHover,
  isEventSelected,
  renderDrawingPreviewLabel,
  embedded,
  renderLaneLabel,
  hideLaneControls,
  timeRangeShadows,
  rangeShadingState,
  onRangeShadingStateChange,
}: InfiniteTimelineWithStateProps<Data, TLaneMeta>) {
  const state = useTimelineState<Data, TLaneMeta>({
    onExpandedLaneIdsChange,
    defaultExpandedLaneIds,
    defaultSnapOption,
  });
  useSyncTimelineAtoms(state, { items, lanes, timeZone, expandedLaneIds });
  return (
    <InfiniteTimeline<Data, TLaneMeta>
      state={state}
      embedded={embedded}
      renderLaneLabel={renderLaneLabel}
      hideLaneControls={hideLaneControls}
      interactionOptions={{
        onItemsChange,
        onDrawComplete,
        onItemClick,
        onEventSelect,
        onRangeSelect,
        onEscapeSelection,
        itemActivateTrigger,
        viewportRange,
      }}
      renderItem={renderItem}
      onItemHover={onItemHover}
      isEventSelected={isEventSelected}
      renderDrawingPreviewLabel={renderDrawingPreviewLabel}
      timeRangeShadows={timeRangeShadows}
      rangeShadingState={rangeShadingState}
      onRangeShadingStateChange={onRangeShadingStateChange}
    />
  );
}

export function InfiniteTimeline<Data = unknown, TLaneMeta = unknown>(
  props: InfiniteTimelineProps<Data, TLaneMeta>,
) {
  return (
    <Provider store={props.state.bundle.store}>
      <TimelineStoreProvider<Data, TLaneMeta> bundle={props.state.bundle}>
        <TimelineInfiniteRoot {...props} />
      </TimelineStoreProvider>
    </Provider>
  );
}
