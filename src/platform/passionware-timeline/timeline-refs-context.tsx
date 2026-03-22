"use client";

import {
  createContext,
  useContext,
  type RefObject,
  type ReactNode,
} from "react";
import type { CalculatedDrawPreview } from "./timeline-layout-logic.ts";

export interface TimelineViewportRefs {
  containerRef: RefObject<HTMLDivElement | null>;
  previewItemRef: RefObject<CalculatedDrawPreview | null>;
  screenXToContainerX: (screenX: number) => number;
}

const TimelineRefsContext = createContext<TimelineViewportRefs | null>(null);

export function TimelineRefsProvider({
  value,
  children,
}: {
  value: TimelineViewportRefs;
  children: ReactNode;
}) {
  return (
    <TimelineRefsContext.Provider value={value}>
      {children}
    </TimelineRefsContext.Provider>
  );
}

export function useTimelineRefs(): TimelineViewportRefs {
  const ctx = useContext(TimelineRefsContext);
  if (!ctx) {
    throw new Error("useTimelineRefs must be used under TimelineRefsProvider");
  }
  return ctx;
}
