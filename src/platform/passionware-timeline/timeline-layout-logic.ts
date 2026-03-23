import type { VisibleTimelineLaneRow } from "./timeline-lane-tree.ts";
import {
  type DragState,
  type TimelineItemInternal,
  LANE_HEIGHT,
  SUB_ROW_HEIGHT,
  timelineItemsTimeOverlap,
} from "./passionware-timeline-core.ts";
import { pixelToTime, timeToPixel } from "./timeline-view-geometry.ts";

export type LanePreviewShape = { start: number; end: number; row: number };

/** Height for lanes whose track content is hidden (minimized). */
export const TIMELINE_MINIMIZED_LANE_HEIGHT_PX = 52;

export function layoutTimeToPixel(
  time: number,
  scrollOffset: number,
  zoom: number,
): number {
  return timeToPixel(time, scrollOffset, zoom);
}

export function layoutPixelToTime(
  pixel: number,
  scrollOffset: number,
  zoom: number,
): number {
  return pixelToTime(pixel, scrollOffset, zoom);
}

export function getItemsWithRowsForLane<Data>(
  mergedItems: TimelineItemInternal<Data>[],
  laneId: string,
  previewItem?: LanePreviewShape,
): (TimelineItemInternal<Data> & { row: number })[] {
  const laneItems = mergedItems.filter((item) => item.laneId === laneId);
  const sortedItems = [...laneItems].sort((a, b) => a.start - b.start);
  const itemsWithRows: (TimelineItemInternal<Data> & { row: number })[] = [];

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
}

export function getMaxRowsForLane<Data>(
  mergedItems: TimelineItemInternal<Data>[],
  laneId: string,
  previewItem?: LanePreviewShape,
): number {
  const itemsWithRows = getItemsWithRowsForLane(mergedItems, laneId, previewItem);
  if (itemsWithRows.length === 0 && !previewItem) return 1;
  const maxItemRow =
    itemsWithRows.length > 0
      ? Math.max(...itemsWithRows.map((i) => i.row))
      : -1;
  const previewRow = previewItem ? previewItem.row : -1;
  return Math.max(maxItemRow, previewRow) + 1;
}

export function getLaneHeightForPreview<Data>(
  mergedItems: TimelineItemInternal<Data>[],
  laneId: string,
  previewItem?: LanePreviewShape,
  minTrackHeightPx?: number,
  minimizedLaneIds?: ReadonlySet<string>,
): number {
  if (minimizedLaneIds?.has(laneId)) {
    return TIMELINE_MINIMIZED_LANE_HEIGHT_PX;
  }
  const maxRows = Math.max(getMaxRowsForLane(mergedItems, laneId, previewItem), 2);
  const computed = Math.max(LANE_HEIGHT, maxRows * SUB_ROW_HEIGHT + 16);
  return Math.max(computed, minTrackHeightPx ?? 0);
}

/** Draw-preview placement including `laneId` for lane-level height/y-offset. */
export type CalculatedDrawPreview = {
  laneId: string;
  start: number;
  end: number;
  row: number;
};

export function getLaneYOffsetForIndex<TLaneMeta>(
  visibleLaneRows: VisibleTimelineLaneRow<TLaneMeta>[],
  laneIndex: number,
  getLaneHeight: (laneId: string, preview?: LanePreviewShape) => number,
  preview: CalculatedDrawPreview | null | undefined,
): number {
  let offset = 0;
  for (let i = 0; i < laneIndex; i++) {
    const lanePreview =
      preview && preview.laneId === visibleLaneRows[i].id ? preview : undefined;
    offset += getLaneHeight(visibleLaneRows[i].id, lanePreview);
  }
  return offset;
}

export function computeCalculatedPreviewItem<Data>(
  dragState: DragState<Data> | null,
  currentMouseX: number | null,
  mergedItems: TimelineItemInternal<Data>[],
  snapTime: (time: number) => number,
  scrollOffset: number,
  zoom: number,
  screenXToContainerX: (screenX: number) => number,
): CalculatedDrawPreview | null {
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
  const currentTime = snapTime(layoutPixelToTime(containerX, scrollOffset, zoom));
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
}

export function totalLanesHeight<TLaneMeta>(
  visibleLaneRows: VisibleTimelineLaneRow<TLaneMeta>[],
  calculatedPreview: CalculatedDrawPreview | null,
  getLaneHeight: (laneId: string, preview?: LanePreviewShape) => number,
): number {
  return visibleLaneRows.reduce((sum, lane) => {
    const lanePreview =
      calculatedPreview && calculatedPreview.laneId === lane.id
        ? calculatedPreview
        : undefined;
    return sum + getLaneHeight(lane.id, lanePreview);
  }, 0);
}
