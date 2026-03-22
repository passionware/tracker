"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from "react";
import {
  type TimelineItem,
  type TimelineItemInternal,
  DRAG_THRESHOLD,
  ITEM_COLORS,
  MIN_ITEM_DURATION,
  PIXELS_PER_MINUTE,
  SIDEBAR_WIDTH,
  TIMELINE_ZOOM_MAX,
  TIMELINE_ZOOM_MIN,
  timelineItemsTimeOverlap,
  toExternalItem,
} from "./passionware-timeline-core.ts";
import {
  normalizeWheelDeltaPixels,
  verticalScrollMaxOffset,
} from "./timeline-view-geometry.ts";
import type { TimelineCoreApi } from "./use-timeline-core.ts";
import type { TimelineLayoutApi } from "./use-timeline-layout.ts";

export interface UseTimelineInteractionsOptions<Data = unknown> {
  onItemsChange?: (items: TimelineItem<Data>[]) => void;
  onItemClick?: (item: TimelineItem<Data>) => void;
  onEventSelect?: (item: TimelineItem<Data>) => void;
  itemActivateTrigger?: "mousedown" | "click";
}

export interface UseTimelineInteractionsParams<Data = unknown> {
  core: TimelineCoreApi<Data>;
  layout: TimelineLayoutApi<Data>;
  containerRef: RefObject<HTMLDivElement | null>;
  screenXToContainerX: (screenX: number) => number;
  options: UseTimelineInteractionsOptions<Data>;
}

/**
 * DOM listeners, wheel/pan/drag, and callbacks that tie core state to layout geometry.
 */
export function useTimelineInteractions<Data>({
  core,
  layout,
  containerRef,
  screenXToContainerX,
  options,
}: UseTimelineInteractionsParams<Data>) {
  const {
    visibleLaneRows,
    internalItems,
    baseDateZoned,
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
    setDragModifications,
    snapTime,
    setCurrentMouseX,
    dragModifications,
    autoFitSignature,
  } = core;

  const lastAutoFitSignatureRef = useRef<string | null>(null);

  const { previewItemRef, getItemsWithRows, getLaneHeight, pixelToTime } =
    layout;

  const {
    onItemsChange,
    onItemClick,
    onEventSelect,
    itemActivateTrigger = "mousedown",
  } = options;

  const generateId = () =>
    `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    const allItems = internalItems;
    if (!allItems || allItems.length === 0) return;
    if (lastAutoFitSignatureRef.current === autoFitSignature) return;

    const minStart = Math.min(...allItems.map((item) => item.start));
    const maxEnd = Math.max(...allItems.map((item) => item.end));
    const totalMinutes = maxEnd - minStart;

    if (totalMinutes <= 0) return;

    const containerWidth = containerRef.current?.clientWidth || 1200;
    const availableWidth = containerWidth - SIDEBAR_WIDTH;

    const padding = 0.1;
    const requiredPixelsPerMinute =
      (availableWidth * (1 - 2 * padding)) / totalMinutes;
    const calculatedZoom = requiredPixelsPerMinute / PIXELS_PER_MINUTE;

    setZoom(calculatedZoom);

    const centerTime = (minStart + maxEnd) / 2;
    const newScrollOffset =
      availableWidth / 2 - centerTime * PIXELS_PER_MINUTE * calculatedZoom;
    setScrollOffset(newScrollOffset);
    lastAutoFitSignatureRef.current = autoFitSignature;
  }, [internalItems, autoFitSignature, containerRef, setScrollOffset, setZoom]);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      const rect = containerRef.current?.getBoundingClientRect();
      const cw = rect?.width ?? 1200;
      const ch = rect?.height ?? 600;
      const dx = normalizeWheelDeltaPixels(e, "x", cw, ch);
      const dy = normalizeWheelDeltaPixels(e, "y", cw, ch);

      if (e.ctrlKey || e.metaKey) {
        if (!rect) return;

        const mouseX = e.clientX - rect.left - SIDEBAR_WIDTH;
        const timeAtMouse = (mouseX - scrollOffset) / (PIXELS_PER_MINUTE * zoom);

        const zoomDelta = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
        const zoomFactor = zoomDelta > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(
          TIMELINE_ZOOM_MIN,
          Math.min(TIMELINE_ZOOM_MAX, zoom * zoomFactor),
        );
        const newScrollOffset = mouseX - timeAtMouse * PIXELS_PER_MINUTE * newZoom;

        setZoom(newZoom);
        setScrollOffset(newScrollOffset);
      } else if (e.shiftKey) {
        setScrollOffset((prev) => prev - dx - dy);
      } else {
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (absX >= absY && absX > 0) {
          setScrollOffset((prev) => prev - dx);
          return;
        }

        if (absY > 0) {
          setVerticalScrollOffset((prev) => {
            const containerHeight = containerRef.current?.clientHeight || 0;
            const preview = previewItemRef.current;
            const totalHeight = visibleLaneRows.reduce((sum, lane) => {
              const lanePreview =
                preview && preview.laneId === lane.id ? preview : undefined;
              return sum + getLaneHeight(lane.id, lanePreview);
            }, 0);
            const maxOffset = verticalScrollMaxOffset(
              totalHeight,
              containerHeight,
            );
            return Math.max(0, Math.min(maxOffset, prev + dy));
          });
        }
      }
    },
    [
      zoom,
      scrollOffset,
      visibleLaneRows,
      getLaneHeight,
      previewItemRef,
      containerRef,
      setScrollOffset,
      setVerticalScrollOffset,
      setZoom,
    ],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel, containerRef]);

  const handleMouseDown = useCallback(
    (e: globalThis.MouseEvent) => {
      if (e.button === 0 && !dragState && !panState) {
        const target = e.target as HTMLElement;
        if (
          e.metaKey ||
          e.ctrlKey ||
          target.closest("[data-timeline-item]") ||
          target.closest("[data-timeline-lane]")
        ) {
          return;
        }
        e.preventDefault();
        setPanState({
          startX: e.clientX,
          startY: e.clientY,
          startScrollOffset: scrollOffset,
          startVerticalScrollOffset: verticalScrollOffset,
        });
      }
    },
    [dragState, panState, scrollOffset, verticalScrollOffset, setPanState],
  );

  const handlePanMove = useCallback(
    (e: globalThis.MouseEvent) => {
      if (!panState) return;

      const deltaX = e.clientX - panState.startX;
      const deltaY = e.clientY - panState.startY;

      setScrollOffset(panState.startScrollOffset + deltaX);
      const containerHeight = containerRef.current?.clientHeight || 0;
      const preview = previewItemRef.current;
      const totalHeight = visibleLaneRows.reduce((sum, lane) => {
        const lanePreview =
          preview && preview.laneId === lane.id ? preview : undefined;
        return sum + getLaneHeight(lane.id, lanePreview);
      }, 0);
      const maxOffset = verticalScrollMaxOffset(totalHeight, containerHeight);
      const newOffset = panState.startVerticalScrollOffset - deltaY;
      setVerticalScrollOffset(Math.max(0, Math.min(maxOffset, newOffset)));
    },
    [
      panState,
      visibleLaneRows,
      getLaneHeight,
      previewItemRef,
      containerRef,
      setScrollOffset,
      setVerticalScrollOffset,
    ],
  );

  const handlePanUp = useCallback(() => {
    setPanState(null);
  }, [setPanState]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("mousedown", handleMouseDown);
    if (panState) {
      window.addEventListener("mousemove", handlePanMove);
      window.addEventListener("mouseup", handlePanUp);
      window.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handlePanMove);
      window.removeEventListener("mouseup", handlePanUp);
    };
  }, [handleMouseDown, handlePanMove, handlePanUp, panState, containerRef]);

  const beginItemDrag = useCallback(
    (
      clientX: number,
      item: TimelineItemInternal<Data>,
      type: "move" | "resize-start" | "resize-end",
    ) => {
      const containerX = screenXToContainerX(clientX);
      setSelectedItemId(item.id);
      setDragState({
        type,
        itemId: item.id,
        startX: clientX,
        startTime: pixelToTime(containerX),
        originalItem: { ...item },
        hasCrossedThreshold: false,
      });
      const externalItem = toExternalItem(item, baseDateZoned);
      if (itemActivateTrigger === "mousedown") {
        onItemClick?.(externalItem);
      }
    },
    [
      screenXToContainerX,
      pixelToTime,
      baseDateZoned,
      itemActivateTrigger,
      onItemClick,
      setDragState,
      setSelectedItemId,
    ],
  );

  const activateItemOnClick = useCallback(
    (_e: ReactMouseEvent, externalItem: TimelineItem<Data>) => {
      if (itemActivateTrigger === "click") {
        onItemClick?.(externalItem);
      }
    },
    [itemActivateTrigger, onItemClick],
  );

  const handleItemMouseDown = (
    e: ReactMouseEvent,
    item: TimelineItemInternal<Data>,
    type: "move" | "resize-start" | "resize-end",
  ) => {
    if (e.button === 1 || (e.button === 0 && (e.metaKey || e.ctrlKey))) return;

    const laneSiblings = getItemsWithRows(item.laneId).filter(
      (i) => i.row === (item.row ?? 0),
    );
    const hasTimeCollision = laneSiblings.some(
      (other) =>
        other.id !== item.id && timelineItemsTimeOverlap(item, other),
    );

    if (type === "move" && e.shiftKey && onEventSelect && !hasTimeCollision) {
      e.stopPropagation();
      setSelectedItemId(item.id);
      onEventSelect(toExternalItem(item, baseDateZoned));
      return;
    }

    e.stopPropagation();
    beginItemDrag(e.clientX, item, type);
  };

  const handleLaneMouseDown = (e: ReactMouseEvent, laneId: string) => {
    const isDrawingButton =
      e.button === 1 || (e.button === 0 && (e.metaKey || e.ctrlKey));

    if (isDrawingButton) {
      if (dragState) return;
      e.stopPropagation();
      const containerX = screenXToContainerX(e.clientX);
      const time = snapTime(pixelToTime(containerX));

      setDragState({
        type: "draw",
        laneId,
        startX: e.clientX,
        startTime: time,
        drawStart: time,
      });
      setCurrentMouseX(e.clientX);
      setSelectedItemId(null);
    } else if (e.button === 0 && !dragState && !panState) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-timeline-item]")) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setPanState({
        startX: e.clientX,
        startY: e.clientY,
        startScrollOffset: scrollOffset,
        startVerticalScrollOffset: verticalScrollOffset,
      });
    }
  };

  const handleMouseMove = useCallback(
    (e: globalThis.MouseEvent) => {
      if (!dragState) return;

      const containerX = screenXToContainerX(e.clientX);
      const currentTime = pixelToTime(containerX);

      if (dragState.type === "draw" && dragState.drawStart !== undefined) {
        setCurrentMouseX(e.clientX);
        return;
      }

      const deltaX = Math.abs(e.clientX - dragState.startX);
      const hasCrossedThreshold =
        dragState.hasCrossedThreshold || deltaX >= DRAG_THRESHOLD;

      if (hasCrossedThreshold && !dragState.hasCrossedThreshold) {
        setDragState((prev) =>
          prev ? { ...prev, hasCrossedThreshold: true } : null,
        );
      }

      if (hasCrossedThreshold && dragState.originalItem && dragState.itemId) {
        const original = dragState.originalItem!;
        const deltaTime = currentTime - dragState.startTime;
        let newStart = original.start;
        let newEnd = original.end;

        switch (dragState.type) {
          case "move":
            newStart = snapTime(original.start + deltaTime);
            newEnd = newStart + (original.end - original.start);
            break;
          case "resize-start":
            newStart = snapTime(
              Math.min(
                original.start + deltaTime,
                original.end - MIN_ITEM_DURATION,
              ),
            );
            break;
          case "resize-end":
            newEnd = snapTime(
              Math.max(
                original.end + deltaTime,
                original.start + MIN_ITEM_DURATION,
              ),
            );
            break;
        }

        setDragModifications((prev) => {
          const newMap = new Map(prev);
          newMap.set(dragState.itemId!, { start: newStart, end: newEnd });
          return newMap;
        });
      }
    },
    [dragState, pixelToTime, snapTime, screenXToContainerX, setDragModifications, setDragState, setCurrentMouseX],
  );

  const handleMouseUp = useCallback(
    (e: globalThis.MouseEvent) => {
      if (!dragState) return;

      const wasDrawing =
        dragState.type === "draw" &&
        dragState.laneId &&
        dragState.drawStart !== undefined;

      let newItem: TimelineItemInternal<Data> | null = null;

      if (wasDrawing) {
        const containerX = screenXToContainerX(e.clientX);
        const endTime = snapTime(pixelToTime(containerX));
        const start = Math.min(dragState.drawStart!, endTime);
        const end = Math.max(dragState.drawStart!, endTime);

        if (end - start >= MIN_ITEM_DURATION) {
          const laneIndex = visibleLaneRows.findIndex(
            (l) => l.id === dragState.laneId!,
          );
          newItem = {
            id: generateId(),
            laneId: dragState.laneId!,
            start,
            end,
            label: "New Event",
            color: ITEM_COLORS[laneIndex % ITEM_COLORS.length],
          } as TimelineItemInternal<Data>;
        }
      }

      previewItemRef.current = null;
      setDragState(null);
      setCurrentMouseX(null);

      if (dragModifications.size > 0 && dragState.itemId) {
        const updatedItems = internalItems.map((item) => {
          const modification = dragModifications.get(item.id);
          return modification ? { ...item, ...modification } : item;
        });
        if (onItemsChange) {
          const externalItems = updatedItems.map((item) =>
            toExternalItem(item, baseDateZoned),
          );
          onItemsChange(externalItems);
        }
        setDragModifications(new Map());
      }

      if (newItem) {
        const updatedItems = [...internalItems, newItem];
        if (onItemsChange) {
          const externalItems = updatedItems.map((item) =>
            toExternalItem(item, baseDateZoned),
          );
          onItemsChange(externalItems);
        }
        setSelectedItemId(newItem.id);
      }
    },
    [
      dragState,
      dragModifications,
      internalItems,
      pixelToTime,
      visibleLaneRows,
      snapTime,
      screenXToContainerX,
      onItemsChange,
      baseDateZoned,
      previewItemRef,
      setDragState,
      setCurrentMouseX,
      setDragModifications,
      setSelectedItemId,
    ],
  );

  useEffect(() => {
    if (dragState) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedItemId) {
        const updatedItems = internalItems.filter(
          (item) => item.id !== selectedItemId,
        );
        if (onItemsChange) {
          const externalItems = updatedItems.map((item) =>
            toExternalItem(item, baseDateZoned),
          );
          onItemsChange(externalItems);
        }
        setSelectedItemId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedItemId,
    internalItems,
    onItemsChange,
    baseDateZoned,
    setSelectedItemId,
  ]);

  const drawingPreview =
    dragState &&
    dragState.type === "draw" &&
    dragState.drawStart !== undefined
      ? { laneId: dragState.laneId, startTime: dragState.drawStart }
      : null;

  const onTimelineGridMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      if (e.button === 0 && !dragState && !panState) {
        const target = e.target as HTMLElement;
        if (
          e.metaKey ||
          e.ctrlKey ||
          target.closest("[data-timeline-item]") ||
          target.closest("[data-timeline-lane]")
        ) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        setPanState({
          startX: e.clientX,
          startY: e.clientY,
          startScrollOffset: scrollOffset,
          startVerticalScrollOffset: verticalScrollOffset,
        });
      }
    },
    [dragState, panState, scrollOffset, verticalScrollOffset, setPanState],
  );

  return {
    handleItemMouseDown,
    handleLaneMouseDown,
    onTimelineGridMouseDown,
    drawingPreview,
    activateItemOnClick,
    itemActivateTrigger,
  };
}
