import {
  Unassigned,
  unassignedUtils,
} from "@/api/_common/query/filters/Unassigned.ts";
import { AbstractPicker } from "@/features/_common/elements/pickers/_common/AbstractPicker.tsx";
import {
  SimpleItem,
  SimpleView,
} from "@/features/_common/elements/pickers/SimpleView.tsx";
import { rd } from "@passionware/monads";
import { ComponentProps } from "react";
import { AbstractEntityViewProps } from "./_common/AbstractEntityView";

interface SimpleSinglePickerProps
  extends Omit<
    ComponentProps<typeof AbstractPicker<string, SimpleItem>>,
    "value" | "onSelect" | "config"
  > {
  items: SimpleItem[];
  value: string | null | undefined;
  onSelect: (value: string | null) => void;
  searchPlaceholder?: string;
  placeholder?: string;
  itemSize?: AbstractEntityViewProps["size"];
}

export function SimpleSinglePicker({
  items,
  value,
  onSelect,
  searchPlaceholder = "Search for an item",
  placeholder = "Select item",
  itemSize = "md",
  ...props
}: SimpleSinglePickerProps) {
  const handleSelect = (
    selectedValue: Unassigned | string | null | undefined,
  ) => {
    // Filter out Unassigned items and only pass string IDs to the callback
    if (
      selectedValue === null ||
      selectedValue === undefined ||
      unassignedUtils.isUnassigned(selectedValue)
    ) {
      onSelect(null);
      return;
    }
    onSelect(selectedValue as string);
  };

  return (
    <AbstractPicker
      value={value ?? null}
      onSelect={handleSelect}
      config={{
        useItem: (id) => {
          if (!id) {
            return rd.ofIdle();
          }
          const item = items.find((p) => p.id === id);
          return item ? rd.of(item) : rd.ofIdle();
        },
        renderItem: (item, pickerProps) => {
          return (
            <SimpleView
              layout={pickerProps.layout}
              size={itemSize}
              item={unassignedUtils.mapOrElse(item, rd.of, rd.ofIdle())}
            />
          );
        },
        renderOption: (item: SimpleItem) => <SimpleView item={rd.of(item)} />,
        getKey: (item: SimpleItem) => item.id,
        getItemId: (item: SimpleItem) => item.id,
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
