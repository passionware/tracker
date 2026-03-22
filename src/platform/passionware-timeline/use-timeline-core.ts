"use client";

import { useCallback, useMemo, useState } from "react";
import { fromAbsolute, getLocalTimeZone } from "@internationalized/date";
import { flattenVisibleTimelineLanes, type Lane } from "./timeline-lane-tree.ts";
import { useTimelineExpansionState } from "./use-timeline-expansion-state.ts";
import {
  type TimelineItem,
  type TimelineItemInternal,
  type DragState,
  type SnapOption,
  BASE_DATE,
  PIXELS_PER_MINUTE,
  SIDEBAR_WIDTH,
  SNAP_VALUES,
  dateToZonedDateTime,
  toInternalItem,
  toMinutes,
} from "./passionware-timeline-core.ts";

export interface UseTimelineCoreOptions<Data = unknown> {
  items: TimelineItem<Data>[];
  lanes?: Lane[];
  timeZone?: string;
  expandedLaneIds?: ReadonlySet<string> | null;
  defaultExpandedLaneIds?: Iterable<string> | ReadonlySet<string> | null;
  onExpandedLaneIdsChange?: (ids: ReadonlySet<string>) => void;
}

/**
 * Timeline data pipeline and numeric interaction state only — no pixel mapping, lane heights, or DOM.
 */
export function useTimelineCore<Data = unknown>({
  items,
  lanes,
  expandedLaneIds: expandedLaneIdsProp,
  defaultExpandedLaneIds,
  onExpandedLaneIdsChange,
  timeZone = getLocalTimeZone(),
}: UseTimelineCoreOptions<Data>) {
  const expansion = useTimelineExpansionState({
    expandedLaneIds: expandedLaneIdsProp ?? undefined,
    defaultExpandedLaneIds: defaultExpandedLaneIds ?? undefined,
    onExpandedLaneIdsChange,
  });

  const visibleLaneRows = useMemo(
    () => flattenVisibleTimelineLanes(lanes ?? [], expansion.expandedLaneIds),
    [lanes, expansion.expandedLaneIds],
  );

  const visibleLaneIdSet = useMemo(
    () => new Set(visibleLaneRows.map((r) => r.id)),
    [visibleLaneRows],
  );

  const itemsForTimeline = useMemo(
    () => items.filter((i) => visibleLaneIdSet.has(i.laneId)),
    [items, visibleLaneIdSet],
  );

  const baseDateZoned = useMemo(() => {
    if (itemsForTimeline && itemsForTimeline.length > 0) {
      const earliest = itemsForTimeline.reduce((earliest, item) => {
        const itemMs = item.start.toDate().getTime();
        const earliestMs = earliest.toDate().getTime();
        return itemMs < earliestMs ? item.start : earliest;
      }, itemsForTimeline[0].start);
      const earliestDate = earliest.toDate();
      earliestDate.setHours(0, 0, 0, 0);
      return fromAbsolute(earliestDate.getTime(), earliest.timeZone);
    }
    return dateToZonedDateTime(BASE_DATE, timeZone);
  }, [itemsForTimeline, timeZone]);

  const internalItems = useMemo(() => {
    if (itemsForTimeline && itemsForTimeline.length > 0) {
      return itemsForTimeline.map((item) => toInternalItem(item, baseDateZoned));
    }
    return [];
  }, [itemsForTimeline, baseDateZoned]);

  const initialView = useMemo(() => {
    const allItems = internalItems;
    if (!allItems || allItems.length === 0) {
      return {
        zoom: 1,
        scrollOffset: -toMinutes(7) * PIXELS_PER_MINUTE,
      };
    }

    const minStart = Math.min(...allItems.map((item) => item.start));
    const maxEnd = Math.max(...allItems.map((item) => item.end));
    const totalMinutes = maxEnd - minStart;

    if (totalMinutes <= 0) {
      return {
        zoom: 1,
        scrollOffset: -toMinutes(7) * PIXELS_PER_MINUTE,
      };
    }

    const estimatedContainerWidth = 1200;
    const availableWidth = estimatedContainerWidth - SIDEBAR_WIDTH;
    const padding = 0.1;
    const requiredPixelsPerMinute =
      (availableWidth * (1 - 2 * padding)) / totalMinutes;
    const calculatedZoom = requiredPixelsPerMinute / PIXELS_PER_MINUTE;
    const zoom = calculatedZoom;
    const centerTime = (minStart + maxEnd) / 2;
    const scrollOffset =
      availableWidth / 2 - centerTime * PIXELS_PER_MINUTE * zoom;

    return { zoom, scrollOffset };
  }, [internalItems]);

  const [scrollOffset, setScrollOffset] = useState(initialView.scrollOffset);
  const [verticalScrollOffset, setVerticalScrollOffset] = useState(0);
  const [zoom, setZoom] = useState(initialView.zoom);
  const [dragState, setDragState] = useState<DragState<Data> | null>(null);
  const [panState, setPanState] = useState<{
    startX: number;
    startY: number;
    startScrollOffset: number;
    startVerticalScrollOffset: number;
  } | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [snapOption, setSnapOption] = useState<SnapOption>("15min");
  const [currentMouseX, setCurrentMouseX] = useState<number | null>(null);

  const [dragModifications, setDragModifications] = useState<
    Map<string, Partial<TimelineItemInternal<Data>>>
  >(new Map());

  const mergedItems = useMemo(() => {
    return internalItems.map((item) => {
      const modification = dragModifications.get(item.id);
      return modification ? { ...item, ...modification } : item;
    });
  }, [internalItems, dragModifications]);

  const autoFitSignature = useMemo(() => {
    if (!internalItems.length) return "";
    return internalItems
      .map((item) => `${item.id}|${item.laneId}|${item.start}|${item.end}`)
      .join(";");
  }, [internalItems]);

  const snapTime = useCallback(
    (time: number): number => {
      const snapValue = SNAP_VALUES[snapOption];
      if (snapValue === 0) return time;
      return Math.round(time / snapValue) * snapValue;
    },
    [snapOption],
  );

  return {
    timeZone,
    visibleLaneRows,
    itemsForTimeline,
    baseDateZoned,
    internalItems,
    mergedItems,
    scrollOffset,
    setScrollOffset,
    verticalScrollOffset,
    setVerticalScrollOffset,
    zoom,
    setZoom,
    dragState,
    setDragState,
    panState,
    setPanState,
    selectedItemId,
    setSelectedItemId,
    hoveredItemId,
    setHoveredItemId,
    snapOption,
    setSnapOption,
    currentMouseX,
    setCurrentMouseX,
    dragModifications,
    setDragModifications,
    snapTime,
    toggleLaneExpanded: expansion.toggleLaneExpanded,
    autoFitSignature,
  };
}

export type TimelineCoreApi<Data> = ReturnType<typeof useTimelineCore<Data>>;
