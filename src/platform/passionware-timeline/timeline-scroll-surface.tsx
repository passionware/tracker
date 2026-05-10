"use client";

import { memo, useLayoutEffect, type ReactNode } from "react";
import {
  useTimelineDragState,
  useTimelinePanState,
  useTimelineTool,
} from "./use-timeline-selectors.ts";
import { useTimelineRefs } from "./timeline-refs-context.tsx";
import { useTimelineStore } from "./timeline-store-context.tsx";
import {
  getLaneHeightForPreview,
  totalLanesHeight,
} from "./timeline-layout-logic.ts";
import { verticalScrollMaxOffset } from "./timeline-view-geometry.ts";

/** Subscribes only to pan/drag for cursor styling; mounts the scroll container ref. */
export const TimelineScrollSurface = memo(function TimelineScrollSurface({
  children,
}: {
  children: ReactNode;
}) {
  const { containerRef, previewItemRef } = useTimelineRefs();
  const { store, atoms } = useTimelineStore();
  const panState = useTimelinePanState();
  const dragState = useTimelineDragState();
  const currentTool = useTimelineTool();

  /** Measure on this node so width matches layout (avoids atom stuck at default / sibling effect order). */
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    /**
     * Re-clamp the vertical scroll offset when the container shrinks/grows (e.g. parent
     * split-view resize): without this, an offset captured for a taller content range
     * survives the resize and clips the top of the tracks panel even when no overflow remains.
     */
    const clampVerticalScrollToContainer = () => {
      const containerHeight = el.clientHeight;
      const visibleLaneRows = store.get(atoms.visibleLaneRowsAtom);
      const mergedItems = store.get(atoms.mergedItemsAtom);
      const minimizedLaneIds = store.get(atoms.minimizedLaneIdsAtom);
      const preview = previewItemRef.current;
      const totalHeight = totalLanesHeight(
        visibleLaneRows,
        preview,
        (laneId, p) => {
          const laneRow = visibleLaneRows.find((l) => l.id === laneId);
          return getLaneHeightForPreview(
            mergedItems,
            laneId,
            p,
            laneRow?.minTrackHeightPx,
            minimizedLaneIds,
          );
        },
      );
      const maxOffset = verticalScrollMaxOffset(totalHeight, containerHeight);
      const current = store.get(atoms.verticalScrollOffsetAtom);
      const clamped = Math.max(0, Math.min(maxOffset, current));
      if (clamped !== current) {
        store.set(atoms.verticalScrollOffsetAtom, clamped);
      }
    };
    const apply = () => {
      const w = el.clientWidth;
      if (w > 0) store.set(atoms.containerWidthAtom, w);
      clampVerticalScrollToContainer();
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    const t0 = requestAnimationFrame(() => {
      requestAnimationFrame(apply);
    });
    return () => {
      cancelAnimationFrame(t0);
      ro.disconnect();
    };
  }, [
    atoms.containerWidthAtom,
    atoms.mergedItemsAtom,
    atoms.minimizedLaneIdsAtom,
    atoms.verticalScrollOffsetAtom,
    atoms.visibleLaneRowsAtom,
    containerRef,
    previewItemRef,
    store,
  ]);

  return (
    <div
      ref={containerRef}
      className="min-h-0 min-w-0 w-full flex-1 relative overflow-hidden touch-none select-none"
      style={{
        cursor: panState
          ? "grabbing"
          : dragState && dragState.type === "draw"
            ? "crosshair"
            : dragState
              ? "grabbing"
              : currentTool === "draw" || currentTool === "select"
                ? "crosshair"
                : "grab",
      }}
    >
      {children}
    </div>
  );
});
