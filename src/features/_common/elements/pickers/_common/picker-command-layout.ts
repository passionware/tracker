import { cn } from "@/lib/utils.ts";

/**
 * CommandGroup layout for entity pickers (single + multi) and similar combobox popovers.
 * cmdk wraps all children in `[cmdk-group-items]`; gap must apply there, not on the group root.
 */
export const pickerCommandGroupClassName = cn(
  "overflow-hidden p-1.5 text-popover-foreground",
  "[&_[cmdk-group-items]]:flex [&_[cmdk-group-items]]:flex-col [&_[cmdk-group-items]]:gap-1.5",
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
);

/** Top slot inside the group (clear / unassigned rows + border under search). */
export const pickerCommandHeaderSlotClassName =
  "space-y-1.5 border-b border-border pb-1.5 empty:hidden";

export function pickerOptionRowOuterClassName(itemsStretch: boolean) {
  return cn(
    "group/option min-w-0 w-full !bg-transparent px-0 py-0 data-[selected=true]:!bg-transparent aria-selected:!bg-transparent",
    itemsStretch
      ? "gap-0 !p-0 items-stretch min-h-0"
      : "flex items-stretch",
  );
}

export function pickerOptionRowInnerClassName(options: {
  isSelected: boolean;
  itemsStretch: boolean;
}) {
  const { isSelected, itemsStretch } = options;
  return cn(
    "flex min-w-0 flex-1 gap-2.5 rounded-md p-2 transition-colors duration-150 ease-out",
    itemsStretch ? "min-h-0 items-stretch" : "items-center",
    !isSelected &&
      "group-data-[selected=true]/option:bg-accent group-data-[selected=true]/option:text-accent-foreground",
    isSelected && [
      "bg-accent text-accent-foreground",
      "group-hover/option:bg-[color-mix(in_oklab,var(--accent)_96%,black)]",
      "group-data-[selected=true]/option:bg-[color-mix(in_oklab,var(--accent)_97%,black)]",
    ],
  );
}
