"use client";

import { useLayoutEffect } from "react";
import { getLocalTimeZone } from "@internationalized/date";
import type { Lane } from "./timeline-lane-tree.ts";
import type { TimelineItem } from "./passionware-timeline-core.ts";
import { expandedLaneIdsToSet } from "./timeline-expanded-lane-set.ts";
import { SIDEBAR_WIDTH } from "./passionware-timeline-core.ts";
import type { TimelineStateApi } from "./use-timeline-state.ts";

export interface SyncTimelineAtomsInput<Data, TLaneMeta> {
  items: TimelineItem<Data>[];
  lanes?: Lane<TLaneMeta>[];
  timeZone?: string;
  /** When set, expansion is controlled from React (written on every sync). */
  expandedLaneIds?: ReadonlySet<string> | null;
  /** Lane label column width (px). Defaults to {@link SIDEBAR_WIDTH}. */
  laneSidebarWidthPx?: number;
}

/**
 * Pushes React-owned timeline inputs into the Jotai store. Call from the same component that owns
 * `useTimelineState` (or a parent), not from timeline UI internals.
 */
export function useSyncTimelineAtoms<Data = unknown, TLaneMeta = unknown>(
  state: TimelineStateApi<Data, TLaneMeta>,
  input: SyncTimelineAtomsInput<Data, TLaneMeta>,
): void {
  const { store, atoms } = state.bundle;
  const { items, lanes, timeZone, expandedLaneIds, laneSidebarWidthPx } =
    input;

  useLayoutEffect(() => {
    store.set(atoms.itemsAtom, items);
    if (lanes !== undefined) {
      store.set(atoms.lanesAtom, lanes);
    }
    store.set(atoms.timeZoneAtom, timeZone ?? getLocalTimeZone());
    if (expandedLaneIds !== undefined) {
      store.set(
        atoms.expandedLaneIdsAtom,
        expandedLaneIdsToSet(expandedLaneIds ?? undefined),
      );
    }
    store.set(
      atoms.laneSidebarWidthPxAtom,
      laneSidebarWidthPx ?? SIDEBAR_WIDTH,
    );
  }, [
    atoms.expandedLaneIdsAtom,
    atoms.itemsAtom,
    atoms.lanesAtom,
    atoms.laneSidebarWidthPxAtom,
    atoms.timeZoneAtom,
    expandedLaneIds,
    items,
    laneSidebarWidthPx,
    lanes,
    store,
    timeZone,
  ]);
}
