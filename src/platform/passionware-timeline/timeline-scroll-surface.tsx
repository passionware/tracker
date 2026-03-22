"use client";

import { memo, useLayoutEffect, type ReactNode } from "react";
import {
  useTimelineDragState,
  useTimelinePanState,
} from "./use-timeline-selectors.ts";
import { useTimelineRefs } from "./timeline-refs-context.tsx";
import { useTimelineStore } from "./timeline-store-context.tsx";

/** Subscribes only to pan/drag for cursor styling; mounts the scroll container ref. */
export const TimelineScrollSurface = memo(function TimelineScrollSurface({
  children,
}: {
  children: ReactNode;
}) {
  const { containerRef } = useTimelineRefs();
  const { store, atoms } = useTimelineStore();
  const panState = useTimelinePanState();
  const dragState = useTimelineDragState();

  /** Measure on this node so width matches layout (avoids atom stuck at default / sibling effect order). */
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const apply = () => {
      const w = el.clientWidth;
      if (w > 0) store.set(atoms.containerWidthAtom, w);
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
  }, [atoms.containerWidthAtom, containerRef, store]);

  return (
    <div
      ref={containerRef}
      className="min-h-0 min-w-0 w-full flex-1 relative overflow-hidden"
      style={{
        cursor: panState
          ? "grabbing"
          : dragState && dragState.type === "draw"
            ? "crosshair"
            : dragState
              ? "grabbing"
              : "grab",
      }}
    >
      {children}
    </div>
  );
});
