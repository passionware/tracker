"use client";

import { useCallback, useMemo, useRef } from "react";
import { getLocalTimeZone } from "@internationalized/date";
import type { Lane } from "./timeline-lane-tree.ts";
import {
  createTimelineJotaiBundle,
  snapTimeForOption,
  type TimelineJotaiBundle,
} from "./timeline-jotai-atoms.ts";
import { type TimelineItem, type SnapOption } from "./passionware-timeline-core.ts";
import { expandedLaneIdsToSet } from "./timeline-expanded-lane-set.ts";

export interface UseTimelineStateOptions<
  Data = unknown,
  TLaneMeta = unknown,
> {
  onExpandedLaneIdsChange?: (ids: ReadonlySet<string>) => void;
  defaultSnapOption?: SnapOption;
  /** Seeded when the bundle is created (first render only). */
  defaultExpandedLaneIds?: Iterable<string> | ReadonlySet<string> | null;
  /** Seeded when the bundle is created (first render only). Prefer `set*` or `useSyncTimelineAtoms`. */
  initialItems?: TimelineItem<Data>[];
  initialLanes?: Lane<TLaneMeta>[];
  initialTimeZone?: string;
}

export interface TimelineStateApi<Data = unknown, TLaneMeta = unknown> {
  bundle: TimelineJotaiBundle<Data, TLaneMeta>;
  snapTime: (time: number) => number;
  toggleLaneExpanded: (laneId: string) => void;
  toggleLaneMinimized: (laneId: string) => void;
  setMinimizedLaneIds: (ids: ReadonlySet<string>) => void;
  setItems: (items: TimelineItem<Data>[]) => void;
  setLanes: (lanes: Lane<TLaneMeta>[] | undefined) => void;
  setTimeZone: (timeZone: string) => void;
  setExpandedLaneIds: (ids: ReadonlySet<string>) => void;
  setScrollOffset: (
    value: number | ((previous: number) => number),
  ) => void;
  setVerticalScrollOffset: (
    value: number | ((previous: number) => number),
  ) => void;
  setZoom: (value: number | ((previous: number) => number)) => void;
  setDragState: (
    value:
      | import("./passionware-timeline-core.ts").DragState<Data> | null
      | ((
          previous: import("./passionware-timeline-core.ts").DragState<Data> | null,
        ) => import("./passionware-timeline-core.ts").DragState<Data> | null),
  ) => void;
  setPanState: (
    value:
      | import("./timeline-jotai-atoms.ts").TimelinePanState | null
      | ((
          previous: import("./timeline-jotai-atoms.ts").TimelinePanState | null,
        ) => import("./timeline-jotai-atoms.ts").TimelinePanState | null),
  ) => void;
  setSelectedItemId: (
    value: string | null | ((previous: string | null) => string | null),
  ) => void;
  setSnapOption: (value: SnapOption) => void;
  setCurrentMouseX: (
    value: number | null | ((previous: number | null) => number | null),
  ) => void;
  setDragModifications: (
    value:
      | Map<
          string,
          Partial<
            import("./passionware-timeline-core.ts").TimelineItemInternal<Data>
          >
        >
      | ((
          previous: Map<
            string,
            Partial<
              import("./passionware-timeline-core.ts").TimelineItemInternal<Data>
            >
          >,
        ) => Map<
          string,
          Partial<
            import("./passionware-timeline-core.ts").TimelineItemInternal<Data>
          >
        >),
  ) => void;
}

/**
 * Creates a stable Jotai timeline bundle and imperative setters. Does **not** sync React props;
 * use `useSyncTimelineAtoms` at the call site (or call `setItems` / `setLanes` / etc.) to push data into the store.
 */
export function useTimelineState<Data = unknown, TLaneMeta = unknown>(
  options: UseTimelineStateOptions<Data, TLaneMeta> = {},
): TimelineStateApi<Data, TLaneMeta> {
  const {
    onExpandedLaneIdsChange,
    defaultSnapOption = "15min",
    defaultExpandedLaneIds,
    initialItems = [],
    initialLanes,
    initialTimeZone = getLocalTimeZone(),
  } = options;

  const onExpandedLaneIdsChangeRef = useRef(onExpandedLaneIdsChange);
  onExpandedLaneIdsChangeRef.current = onExpandedLaneIdsChange;

  const bundle = useMemo(() => {
    const b = createTimelineJotaiBundle<Data, TLaneMeta>();
    const { store, atoms } = b;
    store.set(atoms.itemsAtom, initialItems);
    store.set(atoms.lanesAtom, initialLanes);
    store.set(atoms.timeZoneAtom, initialTimeZone);
    store.set(atoms.snapOptionAtom, defaultSnapOption);
    store.set(
      atoms.expandedLaneIdsAtom,
      expandedLaneIdsToSet(defaultExpandedLaneIds ?? undefined),
    );
    return b;
    // Bundle is intentionally created once; initial* / defaults are first-render snapshots.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { store, atoms } = bundle;

  const setItems = useCallback(
    (items: TimelineItem<Data>[]) => {
      store.set(atoms.itemsAtom, items);
    },
    [atoms.itemsAtom, store],
  );

  const setLanes = useCallback(
    (lanes: Lane<TLaneMeta>[] | undefined) => {
      store.set(atoms.lanesAtom, lanes);
    },
    [atoms.lanesAtom, store],
  );

  const setTimeZone = useCallback(
    (timeZone: string) => {
      store.set(atoms.timeZoneAtom, timeZone);
    },
    [atoms.timeZoneAtom, store],
  );

  const setExpandedLaneIds = useCallback(
    (ids: ReadonlySet<string>) => {
      store.set(atoms.expandedLaneIdsAtom, new Set(ids));
    },
    [atoms.expandedLaneIdsAtom, store],
  );

  const setScrollOffset = useCallback(
    (value: number | ((previous: number) => number)) => {
      const next =
        typeof value === "function"
          ? value(store.get(atoms.scrollOffsetAtom))
          : value;
      store.set(atoms.scrollOffsetAtom, next);
    },
    [atoms.scrollOffsetAtom, store],
  );

  const setVerticalScrollOffset = useCallback(
    (value: number | ((previous: number) => number)) => {
      const next =
        typeof value === "function"
          ? value(store.get(atoms.verticalScrollOffsetAtom))
          : value;
      store.set(atoms.verticalScrollOffsetAtom, next);
    },
    [atoms.verticalScrollOffsetAtom, store],
  );

  const setZoom = useCallback(
    (value: number | ((previous: number) => number)) => {
      const next =
        typeof value === "function" ? value(store.get(atoms.zoomAtom)) : value;
      store.set(atoms.zoomAtom, next);
    },
    [atoms.zoomAtom, store],
  );

  const setDragState = useCallback(
    (
      value:
        | import("./passionware-timeline-core.ts").DragState<Data> | null
        | ((
            p: import("./passionware-timeline-core.ts").DragState<Data> | null,
          ) => import("./passionware-timeline-core.ts").DragState<Data> | null),
    ) => {
      const next =
        typeof value === "function"
          ? value(store.get(atoms.dragStateAtom))
          : value;
      store.set(atoms.dragStateAtom, next);
    },
    [atoms.dragStateAtom, store],
  );

  const setPanState = useCallback(
    (
      value:
        | import("./timeline-jotai-atoms.ts").TimelinePanState | null
        | ((
            p: import("./timeline-jotai-atoms.ts").TimelinePanState | null,
          ) => import("./timeline-jotai-atoms.ts").TimelinePanState | null),
    ) => {
      const next =
        typeof value === "function"
          ? value(store.get(atoms.panStateAtom))
          : value;
      store.set(atoms.panStateAtom, next);
    },
    [atoms.panStateAtom, store],
  );

  const setSelectedItemId = useCallback(
    (value: string | null | ((previous: string | null) => string | null)) => {
      const next =
        typeof value === "function"
          ? value(store.get(atoms.selectedItemIdAtom))
          : value;
      store.set(atoms.selectedItemIdAtom, next);
    },
    [atoms.selectedItemIdAtom, store],
  );

  const setSnapOption = useCallback(
    (value: SnapOption) => {
      store.set(atoms.snapOptionAtom, value);
    },
    [atoms.snapOptionAtom, store],
  );

  const setCurrentMouseX = useCallback(
    (
      value:
        | number
        | null
        | ((previous: number | null) => number | null),
    ) => {
      const next =
        typeof value === "function"
          ? value(store.get(atoms.currentMouseXAtom))
          : value;
      store.set(atoms.currentMouseXAtom, next);
    },
    [atoms.currentMouseXAtom, store],
  );

  const setDragModifications = useCallback(
    (
      value:
        | Map<
            string,
            Partial<
              import("./passionware-timeline-core.ts").TimelineItemInternal<Data>
            >
          >
        | ((
            previous: Map<
              string,
              Partial<
                import("./passionware-timeline-core.ts").TimelineItemInternal<Data>
              >
            >,
          ) => Map<
            string,
            Partial<
              import("./passionware-timeline-core.ts").TimelineItemInternal<Data>
            >
          >),
    ) => {
      const next =
        typeof value === "function"
          ? value(store.get(atoms.dragModificationsAtom))
          : value;
      store.set(atoms.dragModificationsAtom, next);
    },
    [atoms.dragModificationsAtom, store],
  );

  const snapTime = useCallback(
    (time: number) =>
      snapTimeForOption(store.get(atoms.snapOptionAtom), time),
    [atoms.snapOptionAtom, store],
  );

  const toggleLaneExpanded = useCallback(
    (laneId: string) => {
      const prev = store.get(atoms.expandedLaneIdsAtom);
      const next = new Set<string>(prev);
      if (next.has(laneId)) next.delete(laneId);
      else next.add(laneId);
      store.set(atoms.expandedLaneIdsAtom, next);
      onExpandedLaneIdsChangeRef.current?.(next);
    },
    [atoms.expandedLaneIdsAtom, store],
  );

  const setMinimizedLaneIds = useCallback(
    (ids: ReadonlySet<string>) => {
      store.set(atoms.minimizedLaneIdsAtom, new Set(ids));
    },
    [atoms.minimizedLaneIdsAtom, store],
  );

  const toggleLaneMinimized = useCallback(
    (laneId: string) => {
      const prev = store.get(atoms.minimizedLaneIdsAtom);
      const next = new Set<string>(prev);
      if (next.has(laneId)) next.delete(laneId);
      else next.add(laneId);
      store.set(atoms.minimizedLaneIdsAtom, next);
    },
    [atoms.minimizedLaneIdsAtom, store],
  );

  return useMemo(
    () => ({
      bundle,
      snapTime,
      toggleLaneExpanded,
      toggleLaneMinimized,
      setMinimizedLaneIds,
      setItems,
      setLanes,
      setTimeZone,
      setExpandedLaneIds,
      setScrollOffset,
      setVerticalScrollOffset,
      setZoom,
      setDragState,
      setPanState,
      setSelectedItemId,
      setSnapOption,
      setCurrentMouseX,
      setDragModifications,
    }),
    [
      bundle,
      setCurrentMouseX,
      setDragModifications,
      setDragState,
      setExpandedLaneIds,
      setItems,
      setLanes,
      setMinimizedLaneIds,
      setPanState,
      setScrollOffset,
      setSelectedItemId,
      setSnapOption,
      setTimeZone,
      setVerticalScrollOffset,
      setZoom,
      snapTime,
      toggleLaneExpanded,
      toggleLaneMinimized,
    ],
  );
}

export type { TimelineJotaiBundle } from "./timeline-jotai-atoms.ts";
