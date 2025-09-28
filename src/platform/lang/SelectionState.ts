/**
 * Passionware Core - SelectionState
 */
import { maybe, Maybe } from "@passionware/monads";
import { isEqual } from "lodash";
import { useEffect } from "react";

export type SelectionState<T> =
  | {
      type: "inactive";
    }
  | {
      type: "inclusive";
      ids: T[];
    }
  | {
      type: "exclusive";
      ids: T[];
    };

export function fixState<T>(state: SelectionState<T>): SelectionState<T> {
  switch (state.type) {
    case "inclusive":
      return state.ids.length === 0 ? { type: "inactive" } : state;
    default:
      return state;
  }
}

export const selectionState = {
  selectAll: <T>(): SelectionState<T> => ({ type: "exclusive", ids: [] }),
  selectNone: <T>(): SelectionState<T> => ({ type: "inactive" }),
  selectSome: <T>(ids: T[]): SelectionState<T> => ({ type: "inclusive", ids }),
  toggle: <T>(state: SelectionState<T>, id: T): SelectionState<T> => {
    switch (state.type) {
      case "inactive":
        return { type: "inclusive", ids: [id] };
      case "inclusive":
        return fixState(
          state.ids.includes(id)
            ? { type: "inclusive", ids: state.ids.filter((i) => i !== id) }
            : { type: "inclusive", ids: [...state.ids, id] },
        );
      case "exclusive":
        return state.ids.includes(id)
          ? { type: "exclusive", ids: state.ids.filter((i) => i !== id) }
          : { type: "exclusive", ids: [...state.ids, id] };
    }
  },
  addTo: <T>(state: SelectionState<T>, ids: T[]): SelectionState<T> => {
    switch (state.type) {
      case "inactive":
        return { type: "inclusive", ids };
      case "inclusive":
        return { type: "inclusive", ids: [...state.ids, ...ids] };
      case "exclusive":
        return {
          type: "exclusive",
          ids: state.ids.filter((i) => !ids.includes(i)),
        };
    }
  },
  removeFrom: <T>(state: SelectionState<T>, ids: T[]): SelectionState<T> => {
    switch (state.type) {
      case "inactive":
        return { type: "inactive" };
      case "inclusive":
        return fixState({
          type: "inclusive",
          ids: state.ids.filter((i) => !ids.includes(i)),
        });
      case "exclusive":
        return {
          type: "exclusive",
          ids: state.ids.filter((i) => !ids.includes(i)),
        };
    }
  },
  isSelectAll: <T>(state: SelectionState<T>) =>
    state.type === "exclusive" && state.ids.length === 0,
  isSelected: <T>(state: SelectionState<T>, id: T) =>
    (state.type === "inclusive" && state.ids.includes(id)) ||
    (state.type === "exclusive" && !state.ids.includes(id)),
  toggleSelectAll: <T>(state: SelectionState<T>): SelectionState<T> =>
    selectionState.isSelectAll(state)
      ? selectionState.selectNone()
      : selectionState.selectAll(),
  isSomeSelected: <T>(state: SelectionState<T>) => state.type !== "inactive",
  fixWithTotalCount: <T>(
    state: SelectionState<T>,
    total: number,
  ): SelectionState<T> => {
    switch (state.type) {
      case "inactive":
        return state;
      case "inclusive":
        return state.ids.length === total ? selectionState.selectAll() : state;
      case "exclusive":
        return state.ids.length === total ? selectionState.selectNone() : state;
    }
  },
  getTotalSelected: <T>(state: SelectionState<T>, total: number) => {
    switch (state.type) {
      case "inactive":
        return 0;
      case "inclusive":
        return state.ids.length;
      case "exclusive":
        return total - state.ids.length;
    }
  },
  isPartiallySelected: <T>(state: SelectionState<T>, total: number) => {
    const totalSelected = selectionState.getTotalSelected(state, total);
    return totalSelected > 0 && totalSelected < total;
  },
  getSelectedIds: <T>(state: SelectionState<T>, allIds: T[]) => {
    switch (state.type) {
      case "inactive":
        return [];
      case "inclusive":
        return state.ids;
      case "exclusive":
        return allIds.filter((id) => !state.ids.includes(id));
    }
  },
  /**
   * Remove ids that are not in the allIds list
   * @param state
   * @param allIds
   */
  cleanup: <T>(state: SelectionState<T>, allIds: T[]): SelectionState<T> => {
    if (allIds.length === 0 && state.type !== "inactive") {
      // if there are no ids, let's remove any existing selection
      return selectionState.selectNone();
    }
    const cleanedState = ((): SelectionState<T> => {
      switch (state.type) {
        case "inactive":
          return state;
        case "inclusive": {
          const ids = state.ids.filter((id) => allIds.includes(id));
          if (isEqual(ids, state.ids)) {
            // reference stability
            return state;
          }
          return {
            type: "inclusive",
            ids,
          };
        }
        case "exclusive": {
          const ids = state.ids.filter((id) => allIds.includes(id));
          if (isEqual(ids, state.ids)) {
            // reference stability
            return state;
          }
          return {
            type: "exclusive",
            ids,
          };
        }
      }
    })();
    return fixState(cleanedState);
  },
};

/**
 * Hook to clean selection state if some ids are not in the allIds list
 * @param state current selection state
 * @param allIds all ids that are considered as selection members
 * @param onChange callback to change the selection state if cleanup is needed
 */
export function useSelectionCleanup<T>(
  state: SelectionState<T>,
  allIds: Maybe<T[]>,
  onChange: (state: SelectionState<T>) => void,
) {
  useEffect(() => {
    if (maybe.isAbsent(allIds)) {
      // allIds are not available, cannot perform cleanup
      return;
    }
    const cleaned = selectionState.cleanup(state, allIds);
    if (state !== cleaned) {
      onChange(cleaned);
    }
  }, [state, allIds]);
}
