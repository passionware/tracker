"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import type {
  VisibleTimelineLaneRow,
} from "./timeline-lane-tree.ts";
import {
  type DragState,
  type TimelineItemInternal,
  LANE_HEIGHT,
  SUB_ROW_HEIGHT,
  timelineItemsTimeOverlap,
} from "./passionware-timeline-core.ts";
import {
  getVisibleTimeRange,
  pixelToTime,
  pixelsPerMinuteFromZoom,
  timeToPixel,
} from "./timeline-view-geometry.ts";

export interface UseTimelineLayoutParams<Data, TLaneMeta = unknown> {
  mergedItems: TimelineItemInternal<Data>[];
  visibleLaneRows: VisibleTimelineLaneRow<TLaneMeta>[];
  scrollOffset: number;
  zoom: number;
  dragState: DragState<Data> | null;
  currentMouseX: number | null;
  snapTime: (time: number) => number;
  screenXToContainerX: (screenX: number) => number;
  containerRef: RefObject<HTMLDivElement | null>;
}

/**
 * Lane stacking, time↔pixel mapping, and draw-preview placement. Consumed by the timeline UI
 * (and by interaction logic that needs geometry).
 */
export function useTimelineLayout<Data, TLaneMeta = unknown>({
  mergedItems,
  visibleLaneRows,
  scrollOffset,
  zoom,
  dragState,
  currentMouseX,
  snapTime,
  screenXToContainerX,
  containerRef,
}: UseTimelineLayoutParams<Data, TLaneMeta>) {
  const previewItemRef = useRef<{
    laneId: string;
    start: number;
    end: number;
    row: number;
  } | null>(null);

  const timeToPixelFn = useCallback(
    (time: number) => timeToPixel(time, scrollOffset, zoom),
    [scrollOffset, zoom],
  );

  const pixelToTimeFn = useCallback(
    (pixel: number) => pixelToTime(pixel, scrollOffset, zoom),
    [scrollOffset, zoom],
  );

  const getVisibleRange = useCallback(() => {
    const containerWidth = containerRef.current?.clientWidth || 1200;
    return getVisibleTimeRange(scrollOffset, zoom, containerWidth);
  }, [scrollOffset, zoom, containerRef]);

  const getItemsWithRows = useCallback(
    (
      laneId: string,
      previewItem?: { start: number; end: number; row: number },
    ) => {
      const laneItems = mergedItems.filter((item) => item.laneId === laneId);
      const sortedItems = [...laneItems].sort((a, b) => a.start - b.start);
      const itemsWithRows: (TimelineItemInternal<Data> & { row: number })[] =
        [];

      for (const item of sortedItems) {
        let row = 0;
        let foundRow = false;

        while (!foundRow) {
          const hasOverlapWithItems = itemsWithRows.some(
            (placed) =>
              placed.row === row && timelineItemsTimeOverlap(item, placed),
          );

          const hasOverlapWithPreview =
            previewItem &&
            previewItem.row === row &&
            timelineItemsTimeOverlap(item, previewItem);

          if (!hasOverlapWithItems && !hasOverlapWithPreview) {
            foundRow = true;
          } else {
            row++;
          }
        }

        itemsWithRows.push({ ...item, row });
      }

      return itemsWithRows;
    },
    [mergedItems],
  );

  const getMaxRows = useCallback(
    (
      laneId: string,
      previewItem?: { start: number; end: number; row: number },
    ) => {
      const itemsWithRows = getItemsWithRows(laneId, previewItem);
      if (itemsWithRows.length === 0 && !previewItem) return 1;
      const maxItemRow =
        itemsWithRows.length > 0
          ? Math.max(...itemsWithRows.map((i) => i.row))
          : -1;
      const previewRow = previewItem ? previewItem.row : -1;
      return Math.max(maxItemRow, previewRow) + 1;
    },
    [getItemsWithRows],
  );

  const getLaneHeight = useCallback(
    (
      laneId: string,
      previewItem?: { start: number; end: number; row: number },
    ) => {
      const maxRows = Math.max(getMaxRows(laneId, previewItem), 2);
      return Math.max(LANE_HEIGHT, maxRows * SUB_ROW_HEIGHT + 16);
    },
    [getMaxRows],
  );

  const getLaneYOffset = useCallback(
    (laneIndex: number) => {
      let offset = 0;
      const preview = previewItemRef.current;
      for (let i = 0; i < laneIndex; i++) {
        const lanePreview =
          preview && preview.laneId === visibleLaneRows[i].id
            ? preview
            : undefined;
        offset += getLaneHeight(visibleLaneRows[i].id, lanePreview);
      }
      return offset;
    },
    [visibleLaneRows, getLaneHeight],
  );

  const calculatedPreviewItem = useMemo(() => {
    if (
      !dragState ||
      dragState.type !== "draw" ||
      dragState.drawStart === undefined ||
      !dragState.laneId ||
      currentMouseX === null
    ) {
      return null;
    }

    const containerX = screenXToContainerX(currentMouseX);
    const currentTime = snapTime(pixelToTimeFn(containerX));
    const previewStart = Math.min(dragState.drawStart, currentTime);
    const previewEnd = Math.max(dragState.drawStart, currentTime);

    const previewItemTemp: TimelineItemInternal<Data> = {
      id: "__preview__",
      laneId: dragState.laneId,
      start: previewStart,
      end: previewEnd,
      label: "",
      data: undefined as Data,
    };

    const laneItems = mergedItems.filter(
      (item) => item.laneId === dragState.laneId,
    );
    const allItems = [...laneItems, previewItemTemp];
    const sortedItems = allItems.sort((a, b) => a.start - b.start);
    const itemsWithRows: (TimelineItemInternal<Data> & { row: number })[] = [];

    for (const item of sortedItems) {
      let row = 0;
      let foundRow = false;

      while (!foundRow) {
        const hasOverlap = itemsWithRows.some(
          (placed) =>
            placed.row === row && timelineItemsTimeOverlap(item, placed),
        );

        if (!hasOverlap) {
          foundRow = true;
        } else {
          row++;
        }
      }

      itemsWithRows.push({ ...item, row });
    }

    const previewItemWithRow = itemsWithRows.find(
      (item) => item.id === "__preview__",
    );

    if (!previewItemWithRow) {
      return null;
    }

    return {
      laneId: dragState.laneId,
      start: previewStart,
      end: previewEnd,
      row: previewItemWithRow.row,
    };
  }, [
    dragState,
    currentMouseX,
    mergedItems,
    snapTime,
    pixelToTimeFn,
    screenXToContainerX,
  ]);

  useEffect(() => {
    previewItemRef.current = calculatedPreviewItem;
  }, [calculatedPreviewItem]);

  const totalHeight = useMemo(() => {
    return visibleLaneRows.reduce((sum, lane) => {
      const lanePreview =
        calculatedPreviewItem && calculatedPreviewItem.laneId === lane.id
          ? calculatedPreviewItem
          : undefined;
      return sum + getLaneHeight(lane.id, lanePreview);
    }, 0);
  }, [visibleLaneRows, calculatedPreviewItem, getLaneHeight]);

  const pixelsPerMinute = useMemo(() => pixelsPerMinuteFromZoom(zoom), [zoom]);

  return {
    previewItemRef,
    getItemsWithRows,
    getMaxRows,
    getLaneHeight,
    getLaneYOffset,
    timeToPixel: timeToPixelFn,
    pixelToTime: pixelToTimeFn,
    getVisibleRange,
    calculatedPreviewItem,
    totalHeight,
    pixelsPerMinute,
  };
}

export type TimelineLayoutApi<
  Data,
  TLaneMeta = unknown,
> = ReturnType<typeof useTimelineLayout<Data, TLaneMeta>>;
