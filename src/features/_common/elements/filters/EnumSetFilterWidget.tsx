import type { EnumFilter } from "@/api/_common/query/filters/EnumFilter.ts";
import {
  type Unassigned,
  unassignedUtils,
} from "@/api/_common/query/filters/Unassigned.ts";
import { AbstractMultiPicker } from "@/features/_common/elements/pickers/_common/AbstractMultiPicker.tsx";
import { rd } from "@passionware/monads";
import { CircleDot, ListChecks } from "lucide-react";
import { useCallback, useMemo } from "react";

export interface EnumSetFilterWidgetProps<V extends string> {
  fieldLabel: string;
  options: readonly V[];
  optionLabel: (value: V) => string;
  value: EnumFilter<V> | null;
  onUpdate: (value: EnumFilter<V> | null) => void;
  disabled?: boolean;
}

function enumFilterToPickerIds<V extends string>(
  filter: EnumFilter<V> | null,
  options: readonly V[],
): V[] {
  if (
    !filter ||
    filter.operator !== "oneOf" ||
    filter.value.length === 0 ||
    filter.value.length === options.length
  ) {
    return [];
  }
  return [...filter.value];
}

function pickerIdsToEnumFilter<V extends string>(
  ids: V[],
  options: readonly V[],
): EnumFilter<V> | null {
  if (ids.length === 0 || ids.length === options.length) return null;
  const ordered = options.filter((o) => ids.includes(o));
  return { operator: "oneOf", value: [...ordered] };
}

/**
 * Multi-select toolbar filter backed by `EnumFilter` with `oneOf` (subset of enum values).
 * Selecting all options clears the filter (same as “no filter”).
 * No filter is shown as **nothing selected** in the menu (not all checked).
 * Uses `AbstractMultiPicker` with plain labels plus optional row / trigger icons.
 */
export function EnumSetFilterWidget<V extends string>({
  fieldLabel,
  options,
  optionLabel,
  value,
  onUpdate,
  disabled,
}: EnumSetFilterWidgetProps<V>) {
  const pickerValue = useMemo(
    () => enumFilterToPickerIds(value, options),
    [value, options],
  );

  const handleSelect = useCallback(
    (selected: Array<Unassigned | V>) => {
      const ids = selected.filter(unassignedUtils.isAssigned) as V[];
      onUpdate(pickerIdsToEnumFilter(ids, options));
    },
    [onUpdate, options],
  );

  const config = useMemo(
    () => ({
      placeholder: fieldLabel,
      searchPlaceholder: "",
      getKey: (item: V) => String(item),
      getItemId: (item: V) => item,
      useItems: (search: string) => {
        const q = search.toLowerCase();
        return rd.of(
          options.filter((o) => optionLabel(o).toLowerCase().includes(q)),
        );
      },
      useSelectedItems: (ids: V[]) => rd.of(ids),
      renderItem: (item: Unassigned | V) =>
        unassignedUtils.isAssigned(item) ? (
          <span className="ml-2 min-w-0 truncate">{optionLabel(item)}</span>
        ) : null,
      renderOption: (item: V) => (
        <span className="min-w-0 truncate">{optionLabel(item)}</span>
      ),
      renderOptionStart: () => <CircleDot className="size-4" strokeWidth={2} />,
    }),
    [fieldLabel, optionLabel, options],
  );

  return (
    <AbstractMultiPicker<V, V>
      value={pickerValue}
      onSelect={handleSelect}
      config={config}
      size="sm"
      variant="outline"
      align="end"
      disabled={disabled}
      searchable={false}
      triggerStartIcon={<ListChecks className="size-4" strokeWidth={2} />}
      maxValueItems={0}
      itemOverflowWrapperClassName="ml-2 min-w-0 flex-1 truncate text-left text-sm"
      itemOverflowMessage={(rawIds) => {
        const ids = rawIds.filter(unassignedUtils.isAssigned) as V[];
        const active = ids.length > 0 && ids.length < options.length;
        if (!active) {
          return <span className="text-muted-foreground">{fieldLabel}</span>;
        }
        return <span>{ids.map((id) => optionLabel(id)).join(", ")}</span>;
      }}
      aria-label={fieldLabel}
    />
  );
}
