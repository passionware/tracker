"use client";

import { useCallback, useMemo, useState } from "react";
import {
  getLocalTimeZone,
  toCalendarDate,
  toZoned,
} from "@internationalized/date";
import {
  flattenVisibleTimelineLanes,
  type Lane,
  type VisibleTimelineLaneRow,
} from "./timeline-lane-tree.ts";
import { useTimelineExpansionState } from "./use-timeline-expansion-state.ts";
import {
  type TimelineItem,
  type TimelineItemInternal,
  type DragState,
  type SnapOption,
  PIXELS_PER_MINUTE,
  SIDEBAR_WIDTH,
  SNAP_VALUES,
  defaultTimelineBaseZoned,
  toInternalItem,
  toMinutes,
  timelineTemporalToZoned,
} from "./passionware-timeline-core.ts";

export interface UseTimelineCoreOptions<
  Data = unknown,
  TLaneMeta = unknown,
> {
  items: TimelineItem<Data>[];
  lanes?: Lane<TLaneMeta>[];
  timeZone?: string;
  expandedLaneIds?: ReadonlySet<string> | null;
  defaultExpandedLaneIds?: Iterable<string> | ReadonlySet<string> | null;
  onExpandedLaneIdsChange?: (ids: ReadonlySet<string>) => void;
  /** Initial grid / drag snap; default `15min`. */
  defaultSnapOption?: SnapOption;
}

/**
 * Timeline data pipeline and numeric interaction state only — no pixel mapping, lane heights, or DOM.
 */
export function useTimelineCore<Data = unknown, TLaneMeta = unknown>({
  items,
  lanes,
  expandedLaneIds: expandedLaneIdsProp,
  defaultExpandedLaneIds,
  onExpandedLaneIdsChange,
  timeZone = getLocalTimeZone(),
  defaultSnapOption = "15min",
}: UseTimelineCoreOptions<Data, TLaneMeta>) {
  const expansion = useTimelineExpansionState({
    expandedLaneIds: expandedLaneIdsProp ?? undefined,
    defaultExpandedLaneIds: defaultExpandedLaneIds ?? undefined,
    onExpandedLaneIdsChange,
  });

  const visibleLaneRows: VisibleTimelineLaneRow<TLaneMeta>[] = useMemo(
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

  // Anchor from the full item list, not only visible lanes — otherwise collapsing a track
  // that holds the earliest event shifts the grid / "now" line vs real calendar (stories often hide this).
  const baseDateZoned = useMemo(() => {
    if (items.length > 0) {
      const earliest = items.reduce((acc, item) => {
        const itemZ = timelineTemporalToZoned(item.start, timeZone);
        const accZ = timelineTemporalToZoned(acc, timeZone);
        return itemZ.compare(accZ) < 0 ? item.start : acc;
      }, items[0].start);
      const earliestZoned = timelineTemporalToZoned(earliest, timeZone);
      // Start-of-day in the timeline zone — do not use Date#setHours (that is browser-local, not `timeZone`).
      const day = toCalendarDate(earliestZoned);
      return toZoned(day, timeZone);
    }
    return defaultTimelineBaseZoned(timeZone);
  }, [items, timeZone]);

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
  const [snapOption, setSnapOption] = useState<SnapOption>(defaultSnapOption);
  const [currentMouseX, setCurrentMouseX] = useState<number | null>(null);

  const [dragModifications, setDragModifications] = useState<
    Map<string, Partial<TimelineItemInternal<Data>>>
  >(new Map());

  const mergedItems = useMemo(() => {
    return internalItems.map((item) => {
      const modification = dragModifications.get(item.id);
      if (!modification) return item;
      const merged = { ...item, ...modification };
      if (
        modification.start !== undefined ||
        modification.end !== undefined
      ) {
        const { semanticEndMinutes: _, ...rest } = merged;
        return rest;
      }
      return merged;
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

export type TimelineCoreApi<
  Data,
  TLaneMeta = unknown,
> = ReturnType<typeof useTimelineCore<Data, TLaneMeta>>;
