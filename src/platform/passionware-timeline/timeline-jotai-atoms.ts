import { atom, type Atom, type PrimitiveAtom } from "jotai";
import { atomFamily } from "jotai/utils";
import { createStore } from "jotai/vanilla";
import {
  getLocalTimeZone,
  toCalendarDate,
  toZoned,
} from "@internationalized/date";
import {
  flattenVisibleTimelineLanes,
  type Lane,
  type VisibleTimelineLaneRow,
} from "./timeline-lane-tree.ts";
import {
  type DragState,
  type SnapOption,
  type TimelineItem,
  type TimelineItemInternal,
  PIXELS_PER_MINUTE,
  SNAP_VALUES,
  defaultTimelineBaseZoned,
  toInternalItem,
  timelineTemporalToZoned,
  toMinutes,
} from "./passionware-timeline-core.ts";

export type JotaiVanillaStore = ReturnType<typeof createStore>;

export type TimelinePanState = {
  startX: number;
  startY: number;
  startScrollOffset: number;
  startVerticalScrollOffset: number;
};

export interface TimelineJotaiAtoms<Data, TLaneMeta = unknown> {
  itemsAtom: PrimitiveAtom<TimelineItem<Data>[]>;
  lanesAtom: PrimitiveAtom<Lane<TLaneMeta>[] | undefined>;
  timeZoneAtom: PrimitiveAtom<string>;
  expandedLaneIdsAtom: PrimitiveAtom<ReadonlySet<string>>;
  visibleLaneRowsAtom: Atom<VisibleTimelineLaneRow<TLaneMeta>[]>;
  visibleLaneIdSetAtom: Atom<Set<string>>;
  itemsForTimelineAtom: Atom<TimelineItem<Data>[]>;
  baseDateZonedAtom: Atom<import("@internationalized/date").ZonedDateTime>;
  internalItemsAtom: Atom<TimelineItemInternal<Data>[]>;
  autoFitSignatureAtom: Atom<string>;
  scrollOffsetAtom: PrimitiveAtom<number>;
  verticalScrollOffsetAtom: PrimitiveAtom<number>;
  zoomAtom: PrimitiveAtom<number>;
  dragStateAtom: PrimitiveAtom<DragState<Data> | null>;
  panStateAtom: PrimitiveAtom<TimelinePanState | null>;
  selectedItemIdAtom: PrimitiveAtom<string | null>;
  snapOptionAtom: PrimitiveAtom<SnapOption>;
  currentMouseXAtom: PrimitiveAtom<number | null>;
  dragModificationsAtom: PrimitiveAtom<
    Map<string, Partial<TimelineItemInternal<Data>>>
  >;
  mergedItemsAtom: Atom<TimelineItemInternal<Data>[]>;
  mergedItemAtomFamily: (id: string) => Atom<TimelineItemInternal<Data> | undefined>;
  eventIdsAtom: Atom<string[]>;
  containerWidthAtom: PrimitiveAtom<number>;
}

export interface TimelineJotaiBundle<Data, TLaneMeta = unknown> {
  store: JotaiVanillaStore;
  atoms: TimelineJotaiAtoms<Data, TLaneMeta>;
}

export function createTimelineJotaiBundle<
  Data,
  TLaneMeta = unknown,
>(): TimelineJotaiBundle<Data, TLaneMeta> {
  const atoms = createTimelineJotaiAtoms<Data, TLaneMeta>();
  const store = createStore();
  return { store, atoms };
}

function createTimelineJotaiAtoms<
  Data,
  TLaneMeta = unknown,
>(): TimelineJotaiAtoms<Data, TLaneMeta> {
  const itemsAtom = atom<TimelineItem<Data>[]>([]);
  const lanesAtom = atom<Lane<TLaneMeta>[] | undefined>(undefined);
  const timeZoneAtom = atom<string>(getLocalTimeZone());
  const expandedLaneIdsAtom = atom<ReadonlySet<string>>(new Set<string>());

  const visibleLaneRowsAtom = atom((get) =>
    flattenVisibleTimelineLanes(get(lanesAtom) ?? [], get(expandedLaneIdsAtom)),
  );

  const visibleLaneIdSetAtom = atom((get) => {
    const rows = get(visibleLaneRowsAtom);
    return new Set(rows.map((r) => r.id));
  });

  const itemsForTimelineAtom = atom((get) => {
    const visible = get(visibleLaneIdSetAtom);
    return get(itemsAtom).filter((i) => visible.has(i.laneId));
  });

  const baseDateZonedAtom = atom((get) => {
    const items = get(itemsAtom);
    const timeZone = get(timeZoneAtom);
    if (items.length > 0) {
      const earliest = items.reduce((acc, item) => {
        const itemZ = timelineTemporalToZoned(item.start, timeZone);
        const accZ = timelineTemporalToZoned(acc, timeZone);
        return itemZ.compare(accZ) < 0 ? item.start : acc;
      }, items[0].start);
      const earliestZoned = timelineTemporalToZoned(earliest, timeZone);
      const day = toCalendarDate(earliestZoned);
      return toZoned(day, timeZone);
    }
    return defaultTimelineBaseZoned(timeZone);
  });

  const internalItemsAtom = atom((get) => {
    const itemsForTimeline = get(itemsForTimelineAtom);
    const baseDateZoned = get(baseDateZonedAtom);
    if (!itemsForTimeline.length) return [];
    return itemsForTimeline.map((item) => toInternalItem(item, baseDateZoned));
  });

  const autoFitSignatureAtom = atom((get) => {
    const internal = get(internalItemsAtom);
    if (!internal.length) return "";
    return internal
      .map((item) => `${item.id}|${item.laneId}|${item.start}|${item.end}`)
      .join(";");
  });

  const scrollOffsetAtom = atom(-toMinutes(7) * PIXELS_PER_MINUTE);
  const verticalScrollOffsetAtom = atom(0);
  const zoomAtom = atom(1);
  const dragStateAtom = atom<DragState<Data> | null>(null);
  const panStateAtom = atom<TimelinePanState | null>(null);
  const selectedItemIdAtom = atom<string | null>(null);
  const snapOptionAtom = atom<SnapOption>("15min");
  const currentMouseXAtom = atom<number | null>(null);
  const dragModificationsAtom = atom<
    Map<string, Partial<TimelineItemInternal<Data>>>
  >(new Map());

  const mergedItemsAtom = atom((get) => {
    const internalItems = get(internalItemsAtom);
    const dragModifications = get(dragModificationsAtom);
    return internalItems.map((item) => {
      const modification = dragModifications.get(item.id);
      if (!modification) return item;
      const merged = { ...item, ...modification };
      if (
        modification.start !== undefined ||
        modification.end !== undefined
      ) {
        const { semanticEndMinutes: _unused, ...rest } = merged;
        void _unused;
        return rest;
      }
      return merged;
    });
  });

  /** Per-id merged item from internal + drag patch (not `mergedItemsAtom`) so unchanged items keep referential stability. */
  const mergedItemAtomFamily = atomFamily((id: string) =>
    atom((get) => {
      const internalItems = get(internalItemsAtom);
      const item = internalItems.find((i) => i.id === id);
      if (!item) return undefined;
      const dragModifications = get(dragModificationsAtom);
      const modification = dragModifications.get(id);
      if (!modification) return item;
      const merged = { ...item, ...modification };
      if (
        modification.start !== undefined ||
        modification.end !== undefined
      ) {
        const { semanticEndMinutes: _unused, ...rest } = merged;
        void _unused;
        return rest;
      }
      return merged;
    }),
  );

  /** Stable id list during drag (internal items); use `mergedItemsAtom` when positions matter. */
  const eventIdsAtom = atom((get) => get(internalItemsAtom).map((i) => i.id));

  const containerWidthAtom = atom(1200);

  return {
    itemsAtom,
    lanesAtom,
    timeZoneAtom,
    expandedLaneIdsAtom,
    visibleLaneRowsAtom,
    visibleLaneIdSetAtom,
    itemsForTimelineAtom,
    baseDateZonedAtom,
    internalItemsAtom,
    autoFitSignatureAtom,
    scrollOffsetAtom,
    verticalScrollOffsetAtom,
    zoomAtom,
    dragStateAtom,
    panStateAtom,
    selectedItemIdAtom,
    snapOptionAtom,
    currentMouseXAtom,
    dragModificationsAtom,
    mergedItemsAtom,
    mergedItemAtomFamily,
    eventIdsAtom,
    containerWidthAtom,
  };
}

export function snapTimeForOption(
  snapOption: SnapOption,
  time: number,
): number {
  const snapValue = SNAP_VALUES[snapOption];
  if (snapValue === 0) return time;
  return Math.round(time / snapValue) * snapValue;
}
