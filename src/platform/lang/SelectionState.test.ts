// @jest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import {
  selectionState,
  fixState,
  useSelectionCleanup,
  SelectionState,
} from "./SelectionState";
import { renderHook } from "@testing-library/react";
import { maybe } from "@passionware/monads";

describe("selectionState", () => {
  describe("fixState", () => {
    it("should return inactive if inclusive state has no ids", () => {
      expect(fixState({ type: "inclusive", ids: [] })).toEqual({
        type: "inactive",
      });
    });

    it("should return the same state if inclusive state has ids", () => {
      const state = {
        type: "inclusive",
        ids: ["1", "2"],
      } satisfies SelectionState;
      expect(fixState(state)).toEqual(state);
    });

    it("should return the same state for inactive or exclusive states", () => {
      expect(fixState({ type: "inactive" })).toEqual({ type: "inactive" });
      expect(fixState({ type: "exclusive", ids: ["1"] })).toEqual({
        type: "exclusive",
        ids: ["1"],
      });
    });
  });

  describe("selectionState.selectAll", () => {
    it("should return an exclusive state with empty ids", () => {
      expect(selectionState.selectAll()).toEqual({
        type: "exclusive",
        ids: [],
      });
    });
  });

  describe("selectionState.selectNone", () => {
    it("should return an inactive state", () => {
      expect(selectionState.selectNone()).toEqual({ type: "inactive" });
    });
  });

  describe("selectionState.selectSome", () => {
    it("should return an inclusive state with given ids", () => {
      expect(selectionState.selectSome(["1", "2"])).toEqual({
        type: "inclusive",
        ids: ["1", "2"],
      });
    });
  });

  describe("selectionState.toggle", () => {
    it("should add an id to inclusive state if not present", () => {
      const state = { type: "inclusive", ids: ["1"] } satisfies SelectionState;
      expect(selectionState.toggle(state, "2")).toEqual({
        type: "inclusive",
        ids: ["1", "2"],
      });
    });

    it("should remove an id from inclusive state if present", () => {
      const state = {
        type: "inclusive",
        ids: ["1", "2"],
      } satisfies SelectionState;
      expect(selectionState.toggle(state, "1")).toEqual({
        type: "inclusive",
        ids: ["2"],
      });
    });

    it("should add an id to exclusive state if not present", () => {
      const state = { type: "exclusive", ids: ["1"] } satisfies SelectionState;
      expect(selectionState.toggle(state, "2")).toEqual({
        type: "exclusive",
        ids: ["1", "2"],
      });
    });

    it("should remove an id from exclusive state if present", () => {
      const state = {
        type: "exclusive",
        ids: ["1", "2"],
      } satisfies SelectionState;
      expect(selectionState.toggle(state, "1")).toEqual({
        type: "exclusive",
        ids: ["2"],
      });
    });

    it("should create an inclusive state if current state is inactive", () => {
      const state = { type: "inactive" } satisfies SelectionState;
      expect(selectionState.toggle(state, "1")).toEqual({
        type: "inclusive",
        ids: ["1"],
      });
    });
  });

  describe("selectionState.addTo", () => {
    it("should add ids to inclusive state", () => {
      const state = { type: "inclusive", ids: ["1"] } satisfies SelectionState;
      expect(selectionState.addTo(state, ["2", "3"])).toEqual({
        type: "inclusive",
        ids: ["1", "2", "3"],
      });
    });

    it("should remove ids from exclusive state", () => {
      const state = {
        type: "exclusive",
        ids: ["1", "2", "3"],
      } satisfies SelectionState;
      expect(selectionState.addTo(state, ["2", "3"])).toEqual({
        type: "exclusive",
        ids: ["1"],
      });
    });

    it("should create an inclusive state if current state is inactive", () => {
      const state = { type: "inactive" } satisfies SelectionState;
      expect(selectionState.addTo(state, ["1", "2"])).toEqual({
        type: "inclusive",
        ids: ["1", "2"],
      });
    });
  });

  describe("selectionState.removeFrom", () => {
    it("should remove ids from inclusive state", () => {
      const state = {
        type: "inclusive",
        ids: ["1", "2", "3"],
      } satisfies SelectionState;
      expect(selectionState.removeFrom(state, ["2"])).toEqual({
        type: "inclusive",
        ids: ["1", "3"],
      });
    });

    it("should remove ids from exclusive state", () => {
      const state = {
        type: "exclusive",
        ids: ["1", "2", "3"],
      } satisfies SelectionState;
      expect(selectionState.removeFrom(state, ["2"])).toEqual({
        type: "exclusive",
        ids: ["1", "3"],
      });
    });

    it("should return inactive state if current state is inactive", () => {
      const state = { type: "inactive" } satisfies SelectionState;
      expect(selectionState.removeFrom(state, ["1"])).toEqual({
        type: "inactive",
      });
    });
  });

  describe("selectionState.cleanup", () => {
    it("should remove ids not in allIds from inclusive state", () => {
      const state = {
        type: "inclusive",
        ids: ["1", "2", "3"],
      } satisfies SelectionState;
      expect(selectionState.cleanup(state, ["2", "3"])).toEqual({
        type: "inclusive",
        ids: ["2", "3"],
      });
    });

    it("should remove ids not in allIds from exclusive state", () => {
      const state = {
        type: "exclusive",
        ids: ["1", "2", "3"],
      } satisfies SelectionState;
      expect(selectionState.cleanup(state, ["2", "3"])).toEqual({
        type: "exclusive",
        ids: ["2", "3"],
      });
    });

    it("should return inactive if allIds is empty and state is not inactive", () => {
      const state = {
        type: "inclusive",
        ids: ["1", "2"],
      } satisfies SelectionState;
      expect(selectionState.cleanup(state, [])).toEqual({ type: "inactive" });
    });
  });

  describe("selectionState.getSelectedIds", () => {
    it("should return all selected ids for inclusive state", () => {
      const state = {
        type: "inclusive",
        ids: ["1", "2"],
      } satisfies SelectionState;
      expect(selectionState.getSelectedIds(state, ["1", "2", "3"])).toEqual([
        "1",
        "2",
      ]);
    });

    it("should return all unselected ids for exclusive state", () => {
      const state = { type: "exclusive", ids: ["1"] } satisfies SelectionState;
      expect(selectionState.getSelectedIds(state, ["1", "2", "3"])).toEqual([
        "2",
        "3",
      ]);
    });

    it("should return empty array for inactive state", () => {
      const state = { type: "inactive" } satisfies SelectionState;
      expect(selectionState.getSelectedIds(state, ["1", "2", "3"])).toEqual([]);
    });
  });
});

describe("useSelectionCleanup", () => {
  it("should call onChange if cleanup modifies the state", () => {
    const state = {
      type: "inclusive",
      ids: ["1", "2"],
    } satisfies SelectionState;
    const allIds = ["2"];
    const onChange = vi.fn();

    renderHook(() => useSelectionCleanup(state, allIds, onChange));

    expect(onChange).toHaveBeenCalledWith({ type: "inclusive", ids: ["2"] });
  });

  it("should not call onChange if cleanup does not modify the state", () => {
    const state = { type: "inclusive", ids: ["2"] } satisfies SelectionState;
    const allIds = ["2"];
    const onChange = vi.fn();

    renderHook(() => useSelectionCleanup(state, allIds, onChange));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("should not call onChange if allIds is absent", () => {
    const state = {
      type: "inclusive",
      ids: ["1", "2"],
    } satisfies SelectionState;
    const allIds = maybe.ofAbsent();
    const onChange = vi.fn();

    renderHook(() => useSelectionCleanup(state, allIds, onChange));

    expect(onChange).not.toHaveBeenCalled();
  });
});
