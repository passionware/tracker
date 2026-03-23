"use client";

import { Portal } from "@radix-ui/react-portal";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { JotaiVanillaStore } from "./timeline-jotai-atoms.ts";
import type { TimelineItem } from "./passionware-timeline-core.ts";
import { toExternalItem } from "./passionware-timeline-core.ts";
import type { TimelineItemInternal } from "./passionware-timeline-core.ts";
import type { TimelineJotaiBundle } from "./timeline-jotai-atoms.ts";

const INITIAL_THRESHOLD = 5;

class DOMVector {
  constructor(
    readonly x: number,
    readonly y: number,
    readonly magnitudeX: number,
    readonly magnitudeY: number,
  ) {}

  toDOMRect(): DOMRect {
    return new DOMRect(
      Math.min(this.x, this.x + this.magnitudeX),
      Math.min(this.y, this.y + this.magnitudeY),
      Math.abs(this.magnitudeX),
      Math.abs(this.magnitudeY),
    );
  }
}

function intersect(rect1: DOMRect, rect2: DOMRect): boolean {
  return !(
    rect1.right < rect2.left ||
    rect2.right < rect1.left ||
    rect1.bottom < rect2.top ||
    rect2.bottom < rect1.top
  );
}

export function isTimelineMarqueePointer(e: {
  button: number;
  ctrlKey: boolean;
}): boolean {
  return e.button === 2 || (e.button === 0 && e.ctrlKey);
}

function collectHitTimelineItemIds(
  container: HTMLElement,
  vector: DOMVector,
): string[] {
  const rect = vector.toDOMRect();
  const seen = new Set<string>();
  const hits: string[] = [];
  container.querySelectorAll("[data-timeline-item-id]").forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    const id = el.dataset.timelineItemId;
    if (!id || seen.has(id)) return;
    if (intersect(rect, el.getBoundingClientRect())) {
      seen.add(id);
      hits.push(id);
    }
  });
  return hits;
}

export interface UseTimelineMarqueeControllerOptions<
  Data,
  TLaneMeta = unknown,
> {
  store: JotaiVanillaStore;
  bundle: TimelineJotaiBundle<Data, TLaneMeta>;
  containerRef: RefObject<HTMLDivElement | null>;
  onRangeSelect?: (
    items: TimelineItem<Data>[],
    modifier: { extend: boolean; subtract: boolean },
  ) => void;
  isEventSelected?: (item: TimelineItem<Data>) => boolean;
  onEscapeClear?: () => void;
}

export interface TimelineMarqueeControllerApi {
  tryBeginMarquee: (
    e: React.MouseEvent | globalThis.MouseEvent,
    options?: {
      /**
       * When false, Shift+starting on a selected item still uses subtractive mode
       * if the hit target resolves to a selected item.
       */
      allowSubtractiveFromTarget?: boolean;
      /** Start marquee even if trigger is not ctrl-left / right-button. */
      force?: boolean;
    },
  ) => boolean;
  /** Visual rectangle while dragging (viewport coords). */
  marqueeDragVector: DOMVector | null;
}

/**
 * Ctrl+left or right button: drag a rectangle to select items.
 * Shift extends (union); Shift when starting on a selected item subtracts hits from selection.
 * Escape clears via `onEscapeClear`.
 */
export function useTimelineMarqueeController<Data, TLaneMeta = unknown>(
  options: UseTimelineMarqueeControllerOptions<Data, TLaneMeta>,
): TimelineMarqueeControllerApi {
  const {
    store,
    bundle: { atoms },
    containerRef,
    onRangeSelect,
    isEventSelected,
    onEscapeClear,
  } = options;

  const onRangeSelectRef = useRef(onRangeSelect);
  onRangeSelectRef.current = onRangeSelect;
  const isEventSelectedRef = useRef(isEventSelected);
  isEventSelectedRef.current = isEventSelected;
  const onEscapeClearRef = useRef(onEscapeClear);
  onEscapeClearRef.current = onEscapeClear;

  const [marqueeDragVector, setMarqueeDragVector] = useState<DOMVector | null>(
    null,
  );

  const sessionRef = useRef<{
    start: DOMVector;
    extend: boolean;
    subtract: boolean;
    isDragging: boolean;
  } | null>(null);

  const suppressContextMenuRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const cancelActiveMarquee = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    sessionRef.current = null;
    setMarqueeDragVector(null);
    requestAnimationFrame(() => {
      suppressContextMenuRef.current = false;
    });
  }, []);

  useEffect(() => {
    if (!onEscapeClearRef.current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (sessionRef.current) {
        cancelActiveMarquee();
        return;
      }
      onEscapeClearRef.current?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cancelActiveMarquee]);

  useEffect(
    () => () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    },
    [],
  );

  const resolveItemsByIds = useCallback(
    (ids: string[]): TimelineItem<Data>[] => {
      const internal = store.get(atoms.internalItemsAtom) as TimelineItemInternal<
        Data
      >[];
      const baseDateZoned = store.get(atoms.baseDateZonedAtom);
      const byId = new Map(internal.map((i) => [i.id, i] as const));
      const out: TimelineItem<Data>[] = [];
      for (const id of ids) {
        const row = byId.get(id);
        if (row) out.push(toExternalItem(row, baseDateZoned));
      }
      return out;
    },
    [atoms.baseDateZonedAtom, atoms.internalItemsAtom, store],
  );

  const finalizeMarquee = useCallback(
    (vector: DOMVector) => {
      const container = containerRef.current;
      if (!container || !onRangeSelectRef.current) return;
      const ids = collectHitTimelineItemIds(container, vector);
      const items = resolveItemsByIds(ids);
      const s = sessionRef.current;
      onRangeSelectRef.current(items, {
        extend: s?.extend ?? false,
        subtract: s?.subtract ?? false,
      });
    },
    [containerRef, resolveItemsByIds],
  );

  const tryBeginMarquee = useCallback(
    (
      e: React.MouseEvent | globalThis.MouseEvent,
      options?: {
        allowSubtractiveFromTarget?: boolean;
        force?: boolean;
      },
    ) => {
      const allowSubtractiveFromTarget =
        options?.allowSubtractiveFromTarget ?? true;
      const force = options?.force ?? false;
      if (
        !onRangeSelectRef.current ||
        (!force && !isTimelineMarqueePointer(e))
      ) {
        return false;
      }
      e.preventDefault();
      e.stopPropagation();

      const shift = e.shiftKey;
      let subtract = false;
      if (shift && allowSubtractiveFromTarget) {
        const t = e.target;
        if (t instanceof Node) {
          const host =
            t instanceof Element
              ? t.closest("[data-timeline-item-id]")
              : null;
          if (host instanceof HTMLElement) {
            const id = host.dataset.timelineItemId;
            if (id) {
              const [item] = resolveItemsByIds([id]);
              if (item && isEventSelectedRef.current?.(item)) {
                subtract = true;
              }
            }
          }
        }
      }
      const extend = shift && !subtract;

      sessionRef.current = {
        start: new DOMVector(e.clientX, e.clientY, 0, 0),
        extend,
        subtract,
        isDragging: false,
      };
      suppressContextMenuRef.current = true;

      const onMove = (ev: globalThis.MouseEvent) => {
        const sess = sessionRef.current;
        if (!sess) return;
        const deltaX = ev.clientX - sess.start.x;
        const deltaY = ev.clientY - sess.start.y;
        const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
        if (!sess.isDragging && distance < INITIAL_THRESHOLD) return;
        if (!sess.isDragging) {
          sess.isDragging = true;
        }
        setMarqueeDragVector(
          new DOMVector(sess.start.x, sess.start.y, deltaX, deltaY),
        );
      };

      const onUp = (ev: globalThis.MouseEvent) => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        window.removeEventListener("contextmenu", onCtxMenu);
        cleanupRef.current = null;

        const sess = sessionRef.current;
        sessionRef.current = null;
        setMarqueeDragVector(null);

        if (sess?.isDragging) {
          const deltaX = ev.clientX - sess.start.x;
          const deltaY = ev.clientY - sess.start.y;
          finalizeMarquee(
            new DOMVector(sess.start.x, sess.start.y, deltaX, deltaY),
          );
        }
        requestAnimationFrame(() => {
          suppressContextMenuRef.current = false;
        });
        window.getSelection()?.removeAllRanges();
      };

      const onCtxMenu = (ctxEv: MouseEvent) => {
        if (suppressContextMenuRef.current) {
          ctxEv.preventDefault();
        }
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      window.addEventListener("contextmenu", onCtxMenu);
      cleanupRef.current = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        window.removeEventListener("contextmenu", onCtxMenu);
      };

      return true;
    },
    [containerRef, finalizeMarquee, resolveItemsByIds],
  );

  return { tryBeginMarquee, marqueeDragVector };
}

export function TimelineMarqueeOverlay({
  dragVector,
}: {
  dragVector: DOMVector | null;
}) {
  if (!dragVector) return null;
  return (
    <Portal>
      <div
        className="pointer-events-none fixed z-[1100] rounded-md border border-dashed border-purple-400 bg-purple-400/30"
        style={{
          top: Math.min(dragVector.y, dragVector.y + dragVector.magnitudeY),
          left: Math.min(dragVector.x, dragVector.x + dragVector.magnitudeX),
          width: Math.abs(dragVector.magnitudeX),
          height: Math.abs(dragVector.magnitudeY),
        }}
      />
    </Portal>
  );
}

export type { DOMVector };
