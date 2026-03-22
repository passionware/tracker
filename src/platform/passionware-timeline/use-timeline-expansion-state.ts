import { useCallback, useMemo, useState } from "react";

function toSet(iterable?: Iterable<string> | ReadonlySet<string> | null): Set<string> {
  if (iterable === undefined || iterable === null) return new Set();
  return new Set(iterable);
}

export interface UseTimelineExpansionStateOptions {
  /** Controlled expansion; pass with `onExpandedLaneIdsChange` for full control. */
  expandedLaneIds?: ReadonlySet<string> | Iterable<string> | null;
  onExpandedLaneIdsChange?: (next: ReadonlySet<string>) => void;
  /** Used when uncontrolled. */
  defaultExpandedLaneIds?: Iterable<string> | ReadonlySet<string> | null;
}

export interface TimelineExpansionState {
  expandedLaneIds: ReadonlySet<string>;
  setExpandedLaneIds: (next: ReadonlySet<string>) => void;
  toggleLaneExpanded: (laneId: string) => void;
}

/** Controlled or uncontrolled expansion when `lanes` use nested `children`. */
export function useTimelineExpansionState(
  options: UseTimelineExpansionStateOptions = {},
): TimelineExpansionState {
  const controlled = options.expandedLaneIds !== undefined;
  const [internal, setInternal] = useState(() =>
    toSet(options.defaultExpandedLaneIds ?? undefined),
  );

  const expandedLaneIds = useMemo(() => {
    if (controlled) return toSet(options.expandedLaneIds ?? undefined);
    return internal;
  }, [controlled, options.expandedLaneIds, internal]);

  const setExpandedLaneIds = useCallback(
    (next: ReadonlySet<string>) => {
      options.onExpandedLaneIdsChange?.(next);
      if (!controlled) setInternal(new Set(next));
    },
    [controlled, options.onExpandedLaneIdsChange],
  );

  const toggleLaneExpanded = useCallback(
    (laneId: string) => {
      const next = new Set(expandedLaneIds);
      if (next.has(laneId)) next.delete(laneId);
      else next.add(laneId);
      setExpandedLaneIds(next);
    },
    [expandedLaneIds, setExpandedLaneIds],
  );

  return { expandedLaneIds, setExpandedLaneIds, toggleLaneExpanded };
}
