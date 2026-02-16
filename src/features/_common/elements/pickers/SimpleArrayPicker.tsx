import {
  Unassigned,
  unassignedUtils,
} from "@/api/_common/query/filters/Unassigned.ts";
import { AbstractMultiPicker } from "@/features/_common/elements/pickers/_common/AbstractMultiPicker.tsx";
import {
  SimpleItem,
  SimpleView,
} from "@/features/_common/elements/pickers/SimpleView.tsx";
import { rd } from "@passionware/monads";
import { ComponentProps } from "react";
import { AbstractEntityViewProps } from "./_common/AbstractEntityView";

export interface SimpleItemWithCompactLabel extends SimpleItem {
  compactLabel?: string;
}

interface SimpleArrayPickerProps
  extends Omit<
    ComponentProps<typeof AbstractMultiPicker>,
    "value" | "onSelect" | "config"
  > {
  items: SimpleItemWithCompactLabel[];
  value: string[];
  onSelect: (value: string[]) => void;
  searchPlaceholder?: string;
  placeholder?: string;
  itemSize?: AbstractEntityViewProps["size"];
}

export function SimpleArrayPicker({
  items,
  value,
  onSelect,
  searchPlaceholder = "Search for an item",
  placeholder = "Select items",
  itemSize = "md",
  ...props
}: SimpleArrayPickerProps) {
  const handleSelect = (
    selectedValue: Array<Unassigned | string>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _selectedItem: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _action: string,
  ) => {
    // Filter out Unassigned items and only pass string IDs to the callback
    const stringValues = selectedValue.filter(
      unassignedUtils.isAssigned,
    ) as string[];
    onSelect(stringValues);
  };

  return (
    <AbstractMultiPicker
      value={value}
      onSelect={handleSelect}
      config={{
        renderItem: (item, pickerProps) => {
          const resolvedItem = unassignedUtils.mapOrElse(
            item,
            rd.of,
            rd.ofIdle(),
          );
          const displayItem = rd.map(resolvedItem, (i) =>
            i.compactLabel != null ? { ...i, label: i.compactLabel } : i,
          );
          return (
            <SimpleView
              layout={pickerProps.layout}
              size={itemSize}
              item={displayItem}
            />
          );
        },
        renderOption: (item: SimpleItem) => <SimpleView item={rd.of(item)} />,
        getKey: (item: SimpleItem) => item.id,
        getItemId: (item: SimpleItem) => item.id,
        useSelectedItems: (ids: Array<Unassigned | string>) =>
          rd.of(items.filter((p) => ids.includes(p.id))),
        useItems: (query: string) => {
          if (!query) {
            return rd.of(items);
          }
          const lowerQuery = query.toLowerCase();
          return rd.of(
            items.filter((item) =>
              item.label.toLowerCase().includes(lowerQuery),
            ),
          );
        },
        searchPlaceholder,
        placeholder,
      }}
      {...props}
    />
  );
}
