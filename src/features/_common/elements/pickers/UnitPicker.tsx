import { unassignedUtils } from "@/api/_common/query/filters/Unassigned.ts";
import { AbstractPicker } from "@/features/_common/elements/pickers/_common/AbstractPicker.tsx";
import { maybe, rd } from "@passionware/monads";
import { injectConfig } from "@passionware/platform-react";

type Unit = { id: string; label: string };
const UNITS = [
  { id: "pc", label: "piece" },
  { id: "h", label: "hour" },
] satisfies Unit[];

export const UnitPicker = injectConfig(AbstractPicker<Unit["id"], Unit>)
  .fromProps(() => ({
    renderItem: (item) => (
      <span className="flex-1 flex flex-row content-around">
        <span className="mr-3">
          {unassignedUtils.mapOrElse(item, (item) => item.label, "Unassigned")}
        </span>
        {unassignedUtils.mapOrElse(
          item,
          (item) => (
            <span className="inline-block -my-0.5 p-0.5 bg-sky-50 border-sky-200 border rounded-sm text-sky-900 text-xs ml-auto">
              {item.id}
            </span>
          ),
          null,
        )}
      </span>
    ),
    getKey: (item) => item.id,
    getItemId: (item) => item.id,
    useItem: (id) =>
      unassignedUtils.mapOrElse(
        id,
        (id) =>
          maybe.mapOrMake(
            UNITS.find((unit) => unit.id === id),
            rd.of,
            () => rd.ofError(new Error("Unit not found")),
          ),
        rd.ofIdle(),
      ),
    useItems: () => rd.of(UNITS),
    searchPlaceholder: "Search for a unit",
    placeholder: "Select a unit",
  }))
  .transformProps((x) => x.passAll);
