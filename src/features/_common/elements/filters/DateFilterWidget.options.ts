import { DateFilter } from "@/api/_common/query/filters/DateFilter.ts";
import { maybe, Maybe } from "@passionware/monads";
import { Overwrite } from "@passionware/platform-ts";
import { startOfMonth } from "date-fns";
import {
  DayPickerRangeProps,
  DayPickerSingleProps,
  PropsBase,
  PropsRange,
  PropsSingle,
} from "react-day-picker";

/**
 * Based on current filter value, get all relevant DayPicker props.
 * @param filter
 * @param onFilterChange
 */
export function getDisplayOptions(
  filter: Maybe<DateFilter>,
  onFilterChange: (val: Maybe<DateFilter>) => void,
) /* "selected" | "mode" | "defaultMonth" | "onSelect" */ {
  const handleRangeSelect: DayPickerRangeProps["onSelect"] = (date) => {
    if (!date || !date.from || !date.to) {
      onFilterChange(maybe.ofAbsent());
    } else {
      onFilterChange({
        operator: "between",
        value: {
          from: date.from,
          to: date.to,
        },
      });
    }
  };

  const handleSingleSelect: DayPickerSingleProps["onSelect"] = (date) => {
    if (!date) {
      onFilterChange(maybe.ofAbsent());
    } else {
      onFilterChange({
        operator:
          filter?.operator === "between"
            ? "equal"
            : (filter?.operator ?? "equal"),
        value: date,
      });
    }
  };

  if (maybe.isAbsent(filter)) {
    return {
      mode: "range",
      selected: undefined,
      onSelect: handleRangeSelect,
    } satisfies Partial<PropsBase & PropsRange>;
  }
  switch (filter.operator) {
    case "equal":
      return {
        mode: "single",
        defaultMonth: startOfMonth(filter.value),
        selected: filter.value,
        onSelect: handleSingleSelect,
      } satisfies Partial<Overwrite<PropsSingle, PropsBase>>;
    case "greaterThan":
      return {
        mode: "single",
        defaultMonth: startOfMonth(filter.value),
        selected: filter.value,
        onSelect: handleSingleSelect,
        modifiers: {
          today: { after: filter.value }, // Modifiers dla dni po `cutoffDate`
        },
      } satisfies Partial<Overwrite<PropsSingle, PropsBase>>;
    case "lessThan":
      return {
        mode: "single",
        defaultMonth: startOfMonth(filter.value),
        selected: filter.value,
        onSelect: handleSingleSelect,
        modifiers: {
          today: { before: filter.value }, // Modifiers dla dni sprzed `cutoffDate`
        },
      } satisfies Partial<Overwrite<PropsSingle, PropsBase>>;
    case "between":
      return {
        mode: "range",
        defaultMonth: startOfMonth(filter.value.to),
        selected: {
          from: filter.value.from,
          to: filter.value.to,
        },
        onSelect: handleRangeSelect,
      } satisfies Partial<Overwrite<PropsRange, PropsBase>>;
  }
}
