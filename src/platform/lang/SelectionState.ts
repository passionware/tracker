/**
 * Passionware Core - SelectionState
 */
import { maybe, Maybe } from "@passionware/monads";
import { isEqual } from "lodash";
import { useEffect } from "react";

export type SelectionState =
  | {
      type: "inactive";
    }
  | {
      type: "inclusive";
      ids: string[];
    }
  | {
      type: "exclusive";
      ids: string[];
    };

export function fixState(state: SelectionState): SelectionState {
  switch (state.type) {
    case "inclusive":
      return state.ids.length === 0 ? { type: "inactive" } : state;
    default:
      return state;
  }
}

export const selectionState = {
  selectAll: (): SelectionState => ({ type: "exclusive", ids: [] }),
  selectNone: (): SelectionState => ({ type: "inactive" }),
  selectSome: (ids: string[]): SelectionState => ({ type: "inclusive", ids }),
  toggle: (state: SelectionState, id: string): SelectionState => {
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
  addTo: (state: SelectionState, ids: string[]): SelectionState => {
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
  removeFrom: (state: SelectionState, ids: string[]): SelectionState => {
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
  isSelectAll: (state: SelectionState) =>
    state.type === "exclusive" && state.ids.length === 0,
  isSelected: (state: SelectionState, id: string) =>
    (state.type === "inclusive" && state.ids.includes(id)) ||
    (state.type === "exclusive" && !state.ids.includes(id)),
  toggleSelectAll: (state: SelectionState): SelectionState =>
    selectionState.isSelectAll(state)
      ? selectionState.selectNone()
      : selectionState.selectAll(),
  isSomeSelected: (state: SelectionState) => state.type !== "inactive",
  fixWithTotalCount: (state: SelectionState, total: number): SelectionState => {
    switch (state.type) {
      case "inactive":
        return state;
      case "inclusive":
        return state.ids.length === total ? selectionState.selectAll() : state;
      case "exclusive":
        return state.ids.length === total ? selectionState.selectNone() : state;
    }
  },
  getTotalSelected: (state: SelectionState, total: number) => {
    switch (state.type) {
      case "inactive":
        return 0;
      case "inclusive":
        return state.ids.length;
      case "exclusive":
        return total - state.ids.length;
    }
  },
  isPartiallySelected: (state: SelectionState, total: number) => {
    const totalSelected = selectionState.getTotalSelected(state, total);
    return totalSelected > 0 && totalSelected < total;
  },
  getSelectedIds: (state: SelectionState, allIds: string[]) => {
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
  cleanup: (state: SelectionState, allIds: string[]): SelectionState => {
    if (allIds.length === 0 && state.type !== "inactive") {
      // if there are no ids, let's remove any existing selection
      return selectionState.selectNone();
    }
    const cleanedState = ((): SelectionState => {
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
export function useSelectionCleanup(
  state: SelectionState,
  allIds: Maybe<string[]>,
  onChange: (state: SelectionState) => void,
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
