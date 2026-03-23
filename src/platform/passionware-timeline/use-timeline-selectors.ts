"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useMemo } from "react";
import type { ZonedDateTime } from "@internationalized/date";
import type { TimelineTemporal } from "./passionware-timeline-core.ts";
import {
  minutesToZonedDateTime,
  SIDEBAR_WIDTH,
  timelineTemporalToZoned,
  zonedDateTimeToMinutes,
} from "./passionware-timeline-core.ts";
import {
  getVisibleTimeRange,
  pixelToTime,
  pixelsPerMinuteFromZoom,
} from "./timeline-view-geometry.ts";
import type { TimelineJotaiBundle } from "./timeline-jotai-atoms.ts";
import { snapTimeForOption } from "./timeline-jotai-atoms.ts";
import { layoutTimeToPixel } from "./timeline-layout-logic.ts";
import { useTimelineStore } from "./timeline-store-context.tsx";

export function useTimelineScrollOffset(): number {
  const { store, atoms } = useTimelineStore();
  return useAtomValue(atoms.scrollOffsetAtom, { store });
}

export function useTimelineVerticalScrollOffset(): number {
  const { store, atoms } = useTimelineStore();
  return useAtomValue(atoms.verticalScrollOffsetAtom, { store });
}

export function useTimelineZoom(): number {
  const { store, atoms } = useTimelineStore();
  return useAtomValue(atoms.zoomAtom, { store });
}

export function useTimelineSnapOption() {
  const { store, atoms } = useTimelineStore();
  return useAtomValue(atoms.snapOptionAtom, { store });
}

export function useSetTimelineSnapOption() {
  const { store, atoms } = useTimelineStore();
  return useSetAtom(atoms.snapOptionAtom, { store });
}

export function useSetTimelineZoom() {
  const { store, atoms } = useTimelineStore();
  return useSetAtom(atoms.zoomAtom, { store });
}

export function useTimelinePanState() {
  const { store, atoms } = useTimelineStore();
  return useAtomValue(atoms.panStateAtom, { store });
}

export function useTimelineDragState<Data = unknown>() {
  const { store, atoms } = useTimelineStore<Data>();
  return useAtomValue(atoms.dragStateAtom, { store });
}

export function useTimelineSelectedItemId(): string | null {
  const { store, atoms } = useTimelineStore();
  return useAtomValue(atoms.selectedItemIdAtom, { store });
}

export function useTimelineCurrentMouseX(): number | null {
  const { store, atoms } = useTimelineStore();
  return useAtomValue(atoms.currentMouseXAtom, { store });
}

export function useTimelineTimeZone(): string {
  const { store, atoms } = useTimelineStore();
  return useAtomValue(atoms.timeZoneAtom, { store });
}

export function useTimelineBaseDateZoned(): ZonedDateTime {
  const { store, atoms } = useTimelineStore();
  return useAtomValue(atoms.baseDateZonedAtom, { store });
}

export function useTimelineVisibleLaneRows<TLaneMeta = unknown>() {
  const { store, atoms } = useTimelineStore<unknown, TLaneMeta>();
  return useAtomValue(atoms.visibleLaneRowsAtom, { store });
}

export function useTimelineMinimizedLaneIds(): ReadonlySet<string> {
  const { store, atoms } = useTimelineStore();
  return useAtomValue(atoms.minimizedLaneIdsAtom, { store });
}

export function useTimelineItemsForTimelineCount(): number {
  const { store, atoms } = useTimelineStore();
  return useAtomValue(atoms.itemsForTimelineAtom, { store }).length;
}

export function useTimelineMergedItems<Data = unknown>() {
  const { store, atoms } = useTimelineStore<Data>();
  return useAtomValue(atoms.mergedItemsAtom, { store });
}

export function useTimelineInternalItems<Data = unknown>() {
  const { store, atoms } = useTimelineStore<Data>();
  return useAtomValue(atoms.internalItemsAtom, { store });
}

export function useTimelineEventIds(): string[] {
  const { store, atoms } = useTimelineStore();
  return useAtomValue(atoms.eventIdsAtom, { store });
}

export function useTimelineMergedItem<Data = unknown>(id: string) {
  const { store, atoms } = useTimelineStore<Data>();
  return useAtomValue(atoms.mergedItemAtomFamily(id), { store });
}

export function useTimelineContainerWidth(): number {
  const { store, atoms } = useTimelineStore();
  return useAtomValue(atoms.containerWidthAtom, { store });
}

/** Maps last stored screen `currentMouseX` (during draw/drag) into timeline time. */
export function useTimelinePointerZonedTime(
  screenXToContainerX: (screenX: number) => number,
): ZonedDateTime | null {
  const currentMouseX = useTimelineCurrentMouseX();
  const scrollOffset = useTimelineScrollOffset();
  const zoom = useTimelineZoom();
  const base = useTimelineBaseDateZoned();
  const snap = useTimelineSnapTime();
  return useMemo(() => {
    if (currentMouseX === null) return null;
    const containerX = screenXToContainerX(currentMouseX);
    const t = snap(pixelToTime(containerX, scrollOffset, zoom));
    return minutesToZonedDateTime(t, base);
  }, [base, currentMouseX, screenXToContainerX, scrollOffset, snap, zoom]);
}

export interface TimelineHorizontalAxisApi {
  /** Content-area X (grid starts after sidebar); pass timeline minutes. */
  getPointFromMinutes: (minutes: number) => { x: number };
  getPoint: (date: TimelineTemporal) => { x: number };
  getRangeFromMinutes: (
    startMinutes: number,
    endMinutes: number,
  ) => { startPx: number; endPx: number; widthPx: number };
  getRange: (
    start: TimelineTemporal,
    end: TimelineTemporal,
  ) => { startPx: number; endPx: number; widthPx: number };
  pixelsPerMinute: number;
}

export function useTimelineHorizontalAxis<
  Data = unknown,
  TLaneMeta = unknown,
>(
  bundle?: TimelineJotaiBundle<Data, TLaneMeta>,
): TimelineHorizontalAxisApi {
  const fromContext = useTimelineStore<Data, TLaneMeta>();
  const { store, atoms } = bundle ?? fromContext;
  const scrollOffset = useAtomValue(atoms.scrollOffsetAtom, { store });
  const zoom = useAtomValue(atoms.zoomAtom, { store });
  const baseDateZoned = useAtomValue(atoms.baseDateZonedAtom, { store });
  const timeZone = useAtomValue(atoms.timeZoneAtom, { store });

  const pixelsPerMinute = useMemo(
    () => pixelsPerMinuteFromZoom(zoom),
    [zoom],
  );

  return useMemo(() => {
    const toMinutes = (t: TimelineTemporal) =>
      zonedDateTimeToMinutes(timelineTemporalToZoned(t, timeZone), baseDateZoned);

    const contentX = (minutes: number) =>
      layoutTimeToPixel(minutes, scrollOffset, zoom) - SIDEBAR_WIDTH;

    return {
      getPointFromMinutes: (minutes: number) => ({ x: contentX(minutes) }),
      getPoint: (date: TimelineTemporal) => ({
        x: contentX(toMinutes(date)),
      }),
      getRangeFromMinutes: (startMinutes: number, endMinutes: number) => {
        const startPx = contentX(startMinutes);
        const endPx = contentX(endMinutes);
        return {
          startPx,
          endPx,
          widthPx: Math.max(0, endPx - startPx),
        };
      },
      getRange: (start: TimelineTemporal, end: TimelineTemporal) => {
        const a = toMinutes(start);
        const b = toMinutes(end);
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        const startPx = contentX(lo);
        const endPx = contentX(hi);
        return {
          startPx,
          endPx,
          widthPx: Math.max(0, endPx - startPx),
        };
      },
      pixelsPerMinute,
    };
  }, [baseDateZoned, pixelsPerMinute, scrollOffset, timeZone, zoom]);
}

export function useViewportVisibleMinutesRange(): {
  startTime: number;
  endTime: number;
} {
  const { store, atoms } = useTimelineStore();
  const scrollOffset = useAtomValue(atoms.scrollOffsetAtom, { store });
  const zoom = useAtomValue(atoms.zoomAtom, { store });
  const containerWidth = useAtomValue(atoms.containerWidthAtom, { store });
  return useMemo(
    () => getVisibleTimeRange(scrollOffset, zoom, containerWidth),
    [containerWidth, scrollOffset, zoom],
  );
}

export function useViewportStartDate(): ZonedDateTime {
  const base = useTimelineBaseDateZoned();
  const { startTime } = useViewportVisibleMinutesRange();
  return useMemo(
    () => minutesToZonedDateTime(startTime, base),
    [base, startTime],
  );
}

export function useTimelineSnapTime(): (time: number) => number {
  const { store, atoms } = useTimelineStore();
  const snapOption = useAtomValue(atoms.snapOptionAtom, { store });
  return useCallback(
    (time: number) => snapTimeForOption(snapOption, time),
    [snapOption],
  );
}
