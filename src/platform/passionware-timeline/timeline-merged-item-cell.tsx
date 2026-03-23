"use client";

import {
  memo,
  useCallback,
  useMemo,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  type TimelineItem,
  SIDEBAR_WIDTH,
  toExternalItem,
  toInternalItem,
} from "./passionware-timeline-core.ts";
import { DefaultTimelineItem } from "./timeline-default-item.tsx";
import type { InfiniteTimelineProps } from "./timeline-infinite-types.ts";
import { useTimelineHandlersRef } from "./timeline-handlers-ref-context.tsx";
import { layoutTimeToPixel } from "./timeline-layout-logic.ts";
import { pixelsPerMinuteFromZoom } from "./timeline-view-geometry.ts";
import {
  useTimelineBaseDateZoned,
  useTimelineMergedItem,
  useTimelineScrollOffset,
  useTimelineSelectedItemId,
  useTimelineZoom,
} from "./use-timeline-selectors.ts";

type ItemCellProps<Data = unknown> = Pick<
  InfiniteTimelineProps<Data, unknown>,
  "renderItem" | "onItemHover" | "isEventSelected"
> & {
  itemId: string;
  layoutRow: number;
  itemActivateTrigger: "mousedown" | "click";
  laneTrackHeightPx: number;
};

function TimelineMergedItemCellInner<Data = unknown>({
  itemId,
  layoutRow,
  renderItem,
  onItemHover,
  isEventSelected,
  itemActivateTrigger,
  laneTrackHeightPx,
}: ItemCellProps<Data>) {
  const item = useTimelineMergedItem<Data>(itemId);
  const baseDateZoned = useTimelineBaseDateZoned();
  const scrollOffset = useTimelineScrollOffset();
  const zoom = useTimelineZoom();
  const selectedItemId = useTimelineSelectedItemId();
  const handlersRef = useTimelineHandlersRef();

  const pixelsPerMinute = useMemo(
    () => pixelsPerMinuteFromZoom(zoom),
    [zoom],
  );
  const timeToPixel = useCallback(
    (t: number) => layoutTimeToPixel(t, scrollOffset, zoom),
    [scrollOffset, zoom],
  );

  const onItemMouseDown = useCallback(
    (
      e: ReactMouseEvent,
      external: TimelineItem<Data>,
      type: "move" | "resize-start" | "resize-end",
    ) => {
      const internalItem = toInternalItem(external, baseDateZoned);
      handlersRef.current?.handleItemMouseDown(e, internalItem, type);
    },
    [baseDateZoned, handlersRef],
  );

  const onItemClick = useCallback(
    (e: ReactMouseEvent, clicked: TimelineItem<Data>) => {
      handlersRef.current?.activateItemOnClick(e, clicked);
    },
    [handlersRef],
  );

  if (!item) return null;

  const left = timeToPixel(item.start) - SIDEBAR_WIDTH;
  const naturalWidth = (item.end - item.start) * pixelsPerMinute;
  const MIN_VISIBLE_WIDTH = 3;
  const isMinWidth = naturalWidth < MIN_VISIBLE_WIDTH;
  const width = Math.max(naturalWidth, MIN_VISIBLE_WIDTH);
  const externalItem: TimelineItem<Data> = {
    ...toExternalItem(item, baseDateZoned),
    row: layoutRow,
  };
  const selected = isEventSelected?.(externalItem) ?? false;
  const isSelected = selected || selectedItemId === item.id;

  const itemProps = {
    item: externalItem,
    left,
    width,
    isSelected,
    selected,
    isMinWidth,
    laneTrackHeightPx,
    onMouseDown: onItemMouseDown,
    onMouseOver: onItemHover ? () => onItemHover(externalItem) : undefined,
    onClick:
      itemActivateTrigger === "click"
        ? (e: ReactMouseEvent, clicked: TimelineItem<Data>) =>
            onItemClick(e, clicked)
        : undefined,
  };

  return renderItem ? (
    renderItem(itemProps)
  ) : (
    <DefaultTimelineItem {...itemProps} />
  );
}

/** Subscribes per `itemId` so other events do not rerender during drag. */
export const TimelineMergedItemCell = memo(
  TimelineMergedItemCellInner,
) as typeof TimelineMergedItemCellInner;
