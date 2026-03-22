"use client";

import {
  createContext,
  useContext,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react";
import type { TimelineStateApi } from "./use-timeline-state.ts";
import {
  useTimelineInteractions,
  type UseTimelineInteractionsOptions,
} from "./use-timeline-interactions.ts";
import { useTimelineRefs } from "./timeline-refs-context.tsx";

/* eslint-disable @typescript-eslint/no-explicit-any -- shared handler surface across generic timeline instances */
export type TimelineInteractionHandlers = ReturnType<
  typeof useTimelineInteractions<any, any>
>;

const TimelineHandlersRefContext =
  createContext<MutableRefObject<TimelineInteractionHandlers | null> | null>(
    null,
  );

/** Latest interaction API; ref identity is stable so context does not force subtree rerenders. */
export function useTimelineHandlersRef(): MutableRefObject<TimelineInteractionHandlers | null> {
  const ctx = useContext(TimelineHandlersRefContext);
  if (!ctx) {
    throw new Error(
      "useTimelineHandlersRef must be used under TimelineInteractionBridge",
    );
  }
  return ctx;
}

/**
 * Subscribes to pan/drag/autofit atoms (via useTimelineInteractions) but exposes handlers through a
 * stable ref so memoized children are not invalidated on every interaction tick.
 */
export function TimelineInteractionBridge<Data, TLaneMeta = unknown>({
  state,
  interactionOptions,
  children,
}: {
  state: TimelineStateApi<Data, TLaneMeta>;
  interactionOptions: UseTimelineInteractionsOptions<Data>;
  children: ReactNode;
}) {
  const { containerRef, previewItemRef, screenXToContainerX } =
    useTimelineRefs();
  const api = useTimelineInteractions<Data, TLaneMeta>({
    state,
    containerRef,
    screenXToContainerX,
    options: interactionOptions,
    previewItemRef,
  });
  const handlersRef = useRef<TimelineInteractionHandlers | null>(null);
  handlersRef.current = api;
  return (
    <TimelineHandlersRefContext.Provider value={handlersRef}>
      {children}
    </TimelineHandlersRefContext.Provider>
  );
}
