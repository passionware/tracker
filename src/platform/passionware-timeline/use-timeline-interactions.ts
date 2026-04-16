"use client";

/* Atom values are read via store.get() inside handlers; listing store/read helpers in hook
 * deps would rerun effects every render. Subscriptions below cover pan/drag/autofit only.
 */
/* eslint-disable react-hooks/exhaustive-deps */

import { CalendarDate } from "@internationalized/date";
import { useAtomValue } from "jotai";
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
  type TimelineTemporal,
  DRAG_THRESHOLD,
  ITEM_COLORS,
  MIN_ITEM_DURATION,
  PIXELS_PER_MINUTE,
  TIMELINE_ZOOM_MAX,
  TIMELINE_ZOOM_MIN,
  timelineTemporalRangeToLayoutMinutes,
  toExternalItem,
} from "./passionware-timeline-core.ts";
import {
  normalizeWheelDeltaPixels,
  pixelsPerMinuteFromZoom,
  verticalScrollMaxOffset,
} from "./timeline-view-geometry.ts";
import type { VisibleTimelineLaneRow } from "./timeline-lane-tree.ts";
import type { TimelineStateApi } from "./use-timeline-state.ts";
import {
  getLaneHeightForPreview,
  layoutPixelToTime,
  totalLanesHeight,
  type CalculatedDrawPreview,
} from "./timeline-layout-logic.ts";
import {
  isTimelineMarqueePointer,
  useTimelineMarqueeController,
} from "./timeline-marquee-controller.tsx";

function viewportTemporalSerializationKey(t: TimelineTemporal): string {
  return t instanceof CalendarDate ? `cal:${t.toString()}` : `zdt:${t.toString()}`;
}

export interface UseTimelineInteractionsOptions<Data = unknown> {
  onItemsChange?: (items: TimelineItem<Data>[]) => void;
  onDrawComplete?: (item: TimelineItem<Data>) => void;
  onItemClick?: (item: TimelineItem<Data>) => void;
  onEventSelect?: (item: TimelineItem<Data>) => void;
  /**
   * Ctrl+left or right-button drag: items whose DOM hits intersect the rectangle.
   * Use with `isEventSelected` for Shift+subtract when starting on a selected item.
   */
  onRangeSelect?: (
    items: TimelineItem<Data>[],
    modifier: { extend: boolean; subtract: boolean },
  ) => void;
  isEventSelected?: (item: TimelineItem<Data>) => boolean;
  /** Called on Escape when `onRangeSelect` is set (e.g. clear `SelectionState`). */
  onEscapeSelection?: () => void;
  itemActivateTrigger?: "mousedown" | "click";
  /**
   * When set, initial horizontal zoom + scroll fit this span (same layout rules as item
   * start/end) instead of the union of all items. Omit or `null` for default auto-fit.
   */
  viewportRange?: {
    start: TimelineTemporal;
    end: TimelineTemporal;
  } | null;
}

export interface UseTimelineInteractionsParams<
  Data = unknown,
  TLaneMeta = unknown,
> {
  state: TimelineStateApi<Data, TLaneMeta>;
  containerRef: RefObject<HTMLDivElement | null>;
  screenXToContainerX: (screenX: number) => number;
  options: UseTimelineInteractionsOptions<Data>;
  /** Filled by draw-preview sync; wheel/pan read `current` for lane heights. */
  previewItemRef: RefObject<CalculatedDrawPreview | null>;
}

/**
 * DOM listeners, wheel/pan/drag. Reads timeline atoms via `store.get` so this hook
 * does not subscribe to atom updates (avoids rerendering the orchestrator).
 */
export function useTimelineInteractions<Data, TLaneMeta = unknown>({
  state,
  containerRef,
  screenXToContainerX,
  options,
  previewItemRef,
}: UseTimelineInteractionsParams<Data, TLaneMeta>) {
  const { store, atoms } = state.bundle;
  const {
    setScrollOffset,
    setVerticalScrollOffset,
    setZoom,
    setDragState,
    setPanState,
    setSelectedItemId,
    setCurrentMouseX,
    setDragModifications,
    snapTime,
  } = state;

  const {
    onItemsChange,
    onDrawComplete,
    onItemClick,
    onEventSelect,
    onRangeSelect,
    isEventSelected,
    onEscapeSelection,
    itemActivateTrigger = "mousedown",
    viewportRange = null,
  } = options;

  const marquee = useTimelineMarqueeController<Data, TLaneMeta>({
    store,
    bundle: state.bundle,
    containerRef,
    onRangeSelect,
    isEventSelected,
    onEscapeClear: onRangeSelect ? onEscapeSelection : undefined,
  });

  const lastHorizontalFitKeyRef = useRef<string | null>(null);

  const generateId = () =>
    `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const readVisibleLaneRows = () => store.get(atoms.visibleLaneRowsAtom);
  const readInternalItems = () => store.get(atoms.internalItemsAtom);
  const readMergedItems = () => store.get(atoms.mergedItemsAtom);
  const readBaseDateZoned = () => store.get(atoms.baseDateZonedAtom);
  const readScrollOffset = () => store.get(atoms.scrollOffsetAtom);
  const readZoom = () => store.get(atoms.zoomAtom);
  const readVerticalScroll = () => store.get(atoms.verticalScrollOffsetAtom);
  const readDragModifications = () => store.get(atoms.dragModificationsAtom);
  const readDragState = () => store.get(atoms.dragStateAtom);
  const readPanState = () => store.get(atoms.panStateAtom);
  const readMinimizedLaneIds = () => store.get(atoms.minimizedLaneIdsAtom);

  const panState = useAtomValue(atoms.panStateAtom, { store });
  const dragState = useAtomValue(atoms.dragStateAtom, { store });
  const selectedItemId = useAtomValue(atoms.selectedItemIdAtom, { store });
  const currentTool = useAtomValue(atoms.currentToolAtom, { store });
  const autoFitSignature = useAtomValue(atoms.autoFitSignatureAtom, { store });
  const timeZone = useAtomValue(atoms.timeZoneAtom, { store });
  const baseDateZoned = useAtomValue(atoms.baseDateZonedAtom, { store });
  const containerWidth = useAtomValue(atoms.containerWidthAtom, { store });
  const laneSidebarWidthPx = useAtomValue(atoms.laneSidebarWidthPxAtom, {
    store,
  });

  const viewportRangeKey = viewportRange
    ? `${viewportTemporalSerializationKey(viewportRange.start)}|${viewportTemporalSerializationKey(viewportRange.end)}`
    : "";

  type ResolvedPointerAction = "pan" | "draw" | "select" | "none";
  const resolvePointerAction = useCallback(
    (
      e: { button: number; ctrlKey: boolean; metaKey: boolean },
      source: "item" | "lane" | "grid",
    ): ResolvedPointerAction => {
      if (source !== "item" && onRangeSelect && isTimelineMarqueePointer(e)) {
        return "select";
      }
      if (e.button === 1 || (e.button === 0 && e.metaKey)) {
        return "draw";
      }
      if (e.button !== 0) {
        return "none";
      }
      if (currentTool === "select" && onRangeSelect) {
        return "select";
      }
      if (currentTool === "draw" && source !== "item") {
        return "draw";
      }
      return "pan";
    },
    [currentTool, onRangeSelect],
  );

  const pixelToTime = useCallback(
    (pixel: number) =>
      layoutPixelToTime(
        pixel,
        readScrollOffset(),
        readZoom(),
        store.get(atoms.laneSidebarWidthPxAtom),
      ),
    [
      atoms.laneSidebarWidthPxAtom,
      atoms.scrollOffsetAtom,
      atoms.zoomAtom,
      store,
    ],
  );

  useEffect(() => {
    let minStart: number;
    let maxEnd: number;
    let fitKey: string;

    if (viewportRange) {
      const { startMinutes, endMinutes } = timelineTemporalRangeToLayoutMinutes(
        viewportRange.start,
        viewportRange.end,
        timeZone,
        baseDateZoned,
      );
      minStart = startMinutes;
      maxEnd = endMinutes;
      fitKey = `vp|${viewportRangeKey}|${timeZone}|${baseDateZoned.toString()}|${containerWidth}|${laneSidebarWidthPx}`;
    } else {
      const allItems = store.get(atoms.internalItemsAtom) as TimelineItemInternal<
        Data
      >[];
      if (!allItems || allItems.length === 0) return;
      fitKey = `${autoFitSignature}|${laneSidebarWidthPx}`;
      minStart = Math.min(
        ...allItems.map((item: TimelineItemInternal<Data>) => item.start),
      );
      maxEnd = Math.max(
        ...allItems.map((item: TimelineItemInternal<Data>) => item.end),
      );
    }

    if (lastHorizontalFitKeyRef.current === fitKey) return;

    const totalMinutes = maxEnd - minStart;
    if (totalMinutes <= 0) return;

    const cw = containerRef.current?.clientWidth || containerWidth || 1200;
    const availableWidth = Math.max(0, cw - laneSidebarWidthPx);

    const padding = 0.1;
    const requiredPixelsPerMinute =
      (availableWidth * (1 - 2 * padding)) / totalMinutes;
    const calculatedZoom = Math.max(
      TIMELINE_ZOOM_MIN,
      Math.min(
        TIMELINE_ZOOM_MAX,
        requiredPixelsPerMinute / PIXELS_PER_MINUTE,
      ),
    );

    setZoom(calculatedZoom);

    const centerTime = (minStart + maxEnd) / 2;
    const newScrollOffset =
      availableWidth / 2 - centerTime * PIXELS_PER_MINUTE * calculatedZoom;
    setScrollOffset(newScrollOffset);
    lastHorizontalFitKeyRef.current = fitKey;
  }, [
    atoms.internalItemsAtom,
    autoFitSignature,
    baseDateZoned,
    containerRef,
    containerWidth,
    setScrollOffset,
    setZoom,
    store,
    timeZone,
    viewportRangeKey,
    laneSidebarWidthPx,
  ]);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      const rect = containerRef.current?.getBoundingClientRect();
      const cw = rect?.width ?? 1200;
      const ch = rect?.height ?? 600;
      const dx = normalizeWheelDeltaPixels(e, "x", cw, ch);
      const dy = normalizeWheelDeltaPixels(e, "y", cw, ch);

      const scrollOffset = readScrollOffset();
      const zoom = readZoom();
      const visibleLaneRows = readVisibleLaneRows();

      if (e.ctrlKey || e.metaKey) {
        if (!rect) return;

        const mouseX =
          e.clientX - rect.left - store.get(atoms.laneSidebarWidthPxAtom);
        const ppm = pixelsPerMinuteFromZoom(zoom);
        const timeAtMouse = (mouseX - scrollOffset) / ppm;

        const zoomDelta = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
        const zoomFactor = zoomDelta > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(
          TIMELINE_ZOOM_MIN,
          Math.min(TIMELINE_ZOOM_MAX, zoom * zoomFactor),
        );
        const newScrollOffset =
          mouseX - timeAtMouse * pixelsPerMinuteFromZoom(newZoom);

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
          const containerHeight = containerRef.current?.clientHeight || 0;
          const preview = previewItemRef.current;
          const merged = readMergedItems();
          const totalHeight = totalLanesHeight(
            visibleLaneRows,
            preview,
            (laneId, p) => {
              const laneRow = visibleLaneRows.find((l) => l.id === laneId);
              return getLaneHeightForPreview(
                merged,
                laneId,
                p,
                laneRow?.minTrackHeightPx,
                readMinimizedLaneIds(),
              );
            },
          );
          const maxOffset = verticalScrollMaxOffset(
            totalHeight,
            containerHeight,
          );
          const currentV = readVerticalScroll();
          const noVerticalScroll = maxOffset <= 0;
          const atTop = currentV <= 0;
          const atBottom = currentV >= maxOffset - 0.5;
          const dyWantsUp = dy < 0;
          const dyWantsDown = dy > 0;
          const verticalStuck =
            noVerticalScroll ||
            (atTop && dyWantsUp) ||
            (atBottom && dyWantsDown);

          if (verticalStuck) {
            if (!rect) return;
            const mouseX =
              e.clientX - rect.left - store.get(atoms.laneSidebarWidthPxAtom);
            const ppm = pixelsPerMinuteFromZoom(zoom);
            const timeAtMouse = (mouseX - scrollOffset) / ppm;
            const zoomFactor = dy > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(
              TIMELINE_ZOOM_MIN,
              Math.min(TIMELINE_ZOOM_MAX, zoom * zoomFactor),
            );
            const newScrollOffset =
              mouseX - timeAtMouse * pixelsPerMinuteFromZoom(newZoom);
            setZoom(newZoom);
            setScrollOffset(newScrollOffset);
            return;
          }

          setVerticalScrollOffset((prev) =>
            Math.max(0, Math.min(maxOffset, prev + dy)),
          );
        }
      }
    },
    [
      containerRef,
      previewItemRef,
      setScrollOffset,
      setVerticalScrollOffset,
      setZoom,
      store,
      atoms.visibleLaneRowsAtom,
      atoms.laneSidebarWidthPxAtom,
      atoms.scrollOffsetAtom,
      atoms.verticalScrollOffsetAtom,
      atoms.zoomAtom,
      atoms.mergedItemsAtom,
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
      if (e.button === 0 && !readDragState() && !readPanState()) {
        if (resolvePointerAction(e, "grid") !== "pan") {
          return;
        }
        const target = e.target as HTMLElement;
        if (
          target.closest("[data-timeline-item]") ||
          target.closest("[data-timeline-lane]")
        ) {
          return;
        }
        e.preventDefault();
        setPanState({
          startX: e.clientX,
          startY: e.clientY,
          startScrollOffset: readScrollOffset(),
          startVerticalScrollOffset: readVerticalScroll(),
        });
      }
    },
    [
      atoms.dragStateAtom,
      atoms.panStateAtom,
      atoms.scrollOffsetAtom,
      atoms.verticalScrollOffsetAtom,
      setPanState,
      store,
      resolvePointerAction,
    ],
  );

  const handlePanMove = useCallback(
    (e: globalThis.MouseEvent) => {
      const panState = readPanState();
      if (!panState) return;

      const deltaX = e.clientX - panState.startX;
      const deltaY = e.clientY - panState.startY;

      setScrollOffset(panState.startScrollOffset + deltaX);
      const containerHeight = containerRef.current?.clientHeight || 0;
      const preview = previewItemRef.current;
      const visibleLaneRows = readVisibleLaneRows();
      const merged = readMergedItems();
      const totalHeight = totalLanesHeight(
        visibleLaneRows,
        preview,
        (laneId, p) => {
          const laneRow = visibleLaneRows.find((l) => l.id === laneId);
          return getLaneHeightForPreview(
            merged,
            laneId,
            p,
            laneRow?.minTrackHeightPx,
            readMinimizedLaneIds(),
          );
        },
      );
      const maxOffset = verticalScrollMaxOffset(totalHeight, containerHeight);
      const newOffset = panState.startVerticalScrollOffset - deltaY;
      setVerticalScrollOffset(Math.max(0, Math.min(maxOffset, newOffset)));
    },
    [
      containerRef,
      previewItemRef,
      setScrollOffset,
      setVerticalScrollOffset,
      store,
      atoms.mergedItemsAtom,
      atoms.panStateAtom,
      atoms.visibleLaneRowsAtom,
    ],
  );

  const handlePanUp = useCallback(() => {
    setPanState(null);
  }, [setPanState]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("mousedown", handleMouseDown);
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();
    if (panState) {
      window.addEventListener("mousemove", handlePanMove);
      window.addEventListener("mouseup", handlePanUp);
      window.addEventListener("contextmenu", preventContextMenu);
    }

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handlePanMove);
      window.removeEventListener("mouseup", handlePanUp);
      window.removeEventListener("contextmenu", preventContextMenu);
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
      const externalItem = toExternalItem(item, readBaseDateZoned());
      if (itemActivateTrigger === "mousedown") {
        onItemClick?.(externalItem);
      }
    },
    [
      screenXToContainerX,
      pixelToTime,
      itemActivateTrigger,
      onItemClick,
      setDragState,
      setSelectedItemId,
      store,
      atoms.baseDateZonedAtom,
    ],
  );

  const activateItemOnClick = useCallback(
    (_e: ReactMouseEvent, externalItem: TimelineItem<Data>) => {
      if (_e.shiftKey) {
        return;
      }
      if (itemActivateTrigger !== "click") return;
      onItemClick?.(externalItem);
      setDragState(null);
      setCurrentMouseX(null);
      setDragModifications(new Map());
      previewItemRef.current = null;
    },
    [
      itemActivateTrigger,
      onItemClick,
      setDragState,
      setCurrentMouseX,
      setDragModifications,
      previewItemRef,
    ],
  );

  const handleItemMouseDown = (
    e: ReactMouseEvent,
    item: TimelineItemInternal<Data>,
    type: "move" | "resize-start" | "resize-end",
  ) => {
    if (type === "move" && e.button === 0 && e.shiftKey && onEventSelect) {
      e.stopPropagation();
      e.preventDefault();
      setSelectedItemId(item.id);
      onEventSelect(toExternalItem(item, readBaseDateZoned()));
      return;
    }

    const pointerAction = resolvePointerAction(e, "item");
    if (
      onRangeSelect &&
      pointerAction === "select" &&
      marquee.tryBeginMarquee(e, {
        allowSubtractiveFromTarget: true,
        force: e.button === 0 && !e.ctrlKey,
      })
    ) {
      return;
    }
    if (pointerAction !== "pan") return;

    e.stopPropagation();
    beginItemDrag(e.clientX, item, type);
  };

  const handleLaneMouseDown = (e: ReactMouseEvent, laneId: string) => {
    const pointerAction = resolvePointerAction(e, "lane");

    if (
      onRangeSelect &&
      pointerAction === "select" &&
      marquee.tryBeginMarquee(e, {
        allowSubtractiveFromTarget: true,
        force: e.button === 0 && !e.ctrlKey,
      })
    ) {
      return;
    }

    if (pointerAction === "draw") {
      if (readDragState()) return;
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
    } else if (pointerAction === "pan" && !readDragState() && !readPanState()) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-timeline-item]")) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setPanState({
        startX: e.clientX,
        startY: e.clientY,
        startScrollOffset: readScrollOffset(),
        startVerticalScrollOffset: readVerticalScroll(),
      });
    }
  };

  const handleMouseMove = useCallback(
    (e: globalThis.MouseEvent) => {
      const dragState = readDragState();
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
    [
      pixelToTime,
      snapTime,
      screenXToContainerX,
      setDragModifications,
      setDragState,
      setCurrentMouseX,
      store,
      atoms.dragStateAtom,
    ],
  );

  const handleMouseUp = useCallback(
    (e: globalThis.MouseEvent) => {
      const dragState = readDragState();
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
          const laneIndex = readVisibleLaneRows().findIndex(
            (l: VisibleTimelineLaneRow<TLaneMeta>) => l.id === dragState.laneId!,
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
      const dragMods = readDragModifications();
      const internalItems = readInternalItems() as TimelineItemInternal<Data>[];
      const baseDateZoned = readBaseDateZoned();

      setDragState(null);
      setCurrentMouseX(null);

      if (dragMods.size > 0 && dragState.itemId) {
        const updatedItems = internalItems.map(
          (item: TimelineItemInternal<Data>) => {
            const modification = dragMods.get(item.id);
            return modification ? { ...item, ...modification } : item;
          },
        );
        if (onItemsChange) {
          const externalItems = updatedItems.map((item) =>
            toExternalItem(item, baseDateZoned),
          );
          onItemsChange(externalItems as TimelineItem<Data>[]);
        }
        setDragModifications(new Map());
      }

      if (newItem) {
        const externalItem = toExternalItem(newItem, baseDateZoned);
        if (onDrawComplete) {
          onDrawComplete(externalItem);
        } else {
          const updatedItems = [...internalItems, newItem];
          if (onItemsChange) {
            const externalItems = updatedItems.map((item) =>
              toExternalItem(item, baseDateZoned),
            );
            onItemsChange(externalItems as TimelineItem<Data>[]);
          }
          setSelectedItemId(newItem.id);
        }
      }
    },
    [
      pixelToTime,
      snapTime,
      screenXToContainerX,
      onItemsChange,
      onDrawComplete,
      previewItemRef,
      setDragState,
      setCurrentMouseX,
      setDragModifications,
      setSelectedItemId,
      store,
      atoms.dragModificationsAtom,
      atoms.dragStateAtom,
      atoms.internalItemsAtom,
      atoms.baseDateZonedAtom,
      atoms.visibleLaneRowsAtom,
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
      if (e.key === "Escape") {
        const currentDrag = readDragState();
        if (currentDrag?.type === "draw") {
          setDragState(null);
          setCurrentMouseX(null);
          previewItemRef.current = null;
          return;
        }
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedItemId) {
        const updatedItems = (
          readInternalItems() as TimelineItemInternal<Data>[]
        ).filter((item: TimelineItemInternal<Data>) => item.id !== selectedItemId);
        if (onItemsChange) {
          const externalItems = updatedItems.map((item) =>
            toExternalItem(item, readBaseDateZoned()),
          );
          onItemsChange(externalItems as TimelineItem<Data>[]);
        }
        setSelectedItemId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedItemId,
    onItemsChange,
    setSelectedItemId,
    setDragState,
    setCurrentMouseX,
    previewItemRef,
    store,
    atoms.internalItemsAtom,
    atoms.baseDateZonedAtom,
    atoms.dragStateAtom,
  ]);

  const drawingPreview =
    dragState &&
    dragState.type === "draw" &&
    dragState.drawStart !== undefined
      ? {
          laneId: dragState.laneId,
          startTime: dragState.drawStart,
        }
      : null;

  const onTimelineGridMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      const pointerAction = resolvePointerAction(e, "grid");
      if (
        onRangeSelect &&
        pointerAction === "select" &&
        marquee.tryBeginMarquee(e, {
          allowSubtractiveFromTarget: true,
          force: e.button === 0 && !e.ctrlKey,
        })
      ) {
        return;
      }
      if (pointerAction === "draw") {
        return;
      }
      if (pointerAction === "pan" && !readDragState() && !readPanState()) {
        const target = e.target as HTMLElement;
        if (
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
          startScrollOffset: readScrollOffset(),
          startVerticalScrollOffset: readVerticalScroll(),
        });
      }
    },
    [
      setPanState,
      store,
      atoms.dragStateAtom,
      atoms.panStateAtom,
      atoms.scrollOffsetAtom,
      atoms.verticalScrollOffsetAtom,
      onRangeSelect,
      resolvePointerAction,
      marquee.tryBeginMarquee,
    ],
  );

  return {
    handleItemMouseDown,
    handleLaneMouseDown,
    onTimelineGridMouseDown,
    drawingPreview,
    activateItemOnClick,
    itemActivateTrigger,
    marqueeDragVector: marquee.marqueeDragVector,
  };
}
