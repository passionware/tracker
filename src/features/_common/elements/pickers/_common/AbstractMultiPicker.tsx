import {
  Unassigned,
  unassignedUtils,
} from "@/api/_common/query/filters/Unassigned.ts";
import { Button, ButtonProps } from "@/components/ui/button.tsx";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import {
  pickerCommandGroupClassName,
  pickerCommandHeaderSlotClassName,
  pickerOptionRowInnerClassName,
  pickerOptionRowOuterClassName,
} from "@/features/_common/elements/pickers/_common/picker-command-layout.ts";
import { cn } from "@/lib/utils.ts";
import { Maybe, rd, RemoteData } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Overwrite } from "@passionware/platform-ts";
import { PopoverContentProps } from "@radix-ui/react-popover";
import { cva } from "class-variance-authority";
import { CommandLoading } from "cmdk";
import { partialRight, xor } from "lodash";
import { Check, ChevronsUpDown, LoaderCircle, Unlink2, X } from "lucide-react";
import { Fragment, MouseEvent, ReactNode, useRef, useState } from "react";

export interface AbstractPickerConfig<Id, Data, Props> {
  useSelectedItems: (ids: Id[]) => RemoteData<Data[]>;
  useItems: (query: string) => RemoteData<Data[]>;
  renderItem: (item: Unassigned | Data, props: Props) => ReactNode;
  renderOption?: (item: Data) => ReactNode;
  /** When set, mouse selection uses zone-specific rules; keyboard still toggles. */
  renderMultiOption?: (
    item: Data,
    ctx: {
      isSelected: boolean;
      itemId: Id;
      onAvatarClick: (e: MouseEvent) => void;
      /** Entire row to the right of the avatar (incl. check) = exclusive select. */
      onRightPartClick: (e: MouseEvent) => void;
      trailingSlot: ReactNode;
      onExclusiveZonePointerEnter: () => void;
      onExclusiveZonePointerLeave: () => void;
      /** True when another row's exclusive strip is hovered — fade this row's strip only. */
      dimExclusiveStrip: boolean;
    },
  ) => ReactNode;
  getItemId: (item: Data) => Id;
  getKey: (item: Data) => string;
  unassignedLabel?: ReactNode;
  searchPlaceholder?: string;
  placeholder?: string;
}

export type AbstractMultiPickerProps<Id, Data> = Overwrite<
  ButtonProps,
  {
    size?: "xs" | "sm" | "md" | "lg";
    value: Array<Unassigned | Id>;
    onSelect: Maybe<
      (
        value: Array<Unassigned | Id>,
        selectedItem: Maybe<Unassigned | Id>,
        action: "include" | "exclude" | "toggle" | "clear",
      ) => void | Promise<void>
    >;
    config: AbstractPickerConfig<Id, Data, AbstractMultiPickerProps<Id, Data>>;
    allowUnassigned?: boolean;
    align?: PopoverContentProps["align"];
    side?: PopoverContentProps["side"];
    layout?: "full" | "avatar";
    /** When set, only this many selected items are shown in the trigger; overflow is summarized by itemOverflowMessage. */
    maxValueItems?: number;
    /** When maxValueItems is set and there is overflow, this is called with the full value and rendered instead of the extra items. */
    itemOverflowMessage?: (value: Array<Unassigned | Id>) => ReactNode;
  }
>;

const buttonPaddingVariant = cva("", {
  variants: {
    size: {
      xs: "px-0.5",
      sm: "pl-1 pr-1.5",
      md: "pl-1 pr-2",
      lg: "pl-1 pr-2",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export function AbstractMultiPicker<Id, Data>(
  _props: AbstractMultiPickerProps<Id, Data>,
) {
  const {
    value,
    onSelect,
    config,
    size,
    variant,
    className,
    allowUnassigned,
    align = "end",
    side = "top",
    maxValueItems,
    itemOverflowMessage,
    ...rest
  } = _props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  /** While pointer is over an option's exclusive strip, other options fade (renderMultiOption only). */
  const [exclusiveHoverKey, setExclusiveHoverKey] = useState<string | null>(
    null,
  );
  const promise = promiseState.useRemoteData();
  /** cmdk Item also calls onSelect on click; without this, that toggle runs after zone clicks and breaks exclusive select. */
  const suppressCmdkItemSelectRef = useRef(false);

  const options = rd.useLastWithPlaceholder(config.useItems(query));

  const valueWithoutUnassigned = value.filter(unassignedUtils.isAssigned);
  const unassignedIndex = value.findIndex(unassignedUtils.isUnassigned);
  const selectedItems = rd.map(
    config.useSelectedItems(valueWithoutUnassigned),
    (items) =>
      unassignedIndex === -1
        ? items
        : [
            ...items.slice(0, unassignedIndex),
            unassignedUtils.ofUnassigned(),
            ...items.slice(unassignedIndex),
          ],
  );

  const selectedItemsWithPlaceholder = rd.useLastWithPlaceholder(selectedItems);

  // hmm moze najpierw nie wspierać valueWithPlaceholder zeby uprosicc kod

  const currentOption =
    value.length === 0 ? rd.ofIdle() : selectedItemsWithPlaceholder;

  const handleSelect = (
    itemIds: Array<Unassigned | Id>,
    selectedItem: Maybe<Unassigned | Id>,
    action: "include" | "exclude" | "toggle" | "clear",
  ) => {
    const result = onSelect?.(itemIds, selectedItem, action);
    if (result) {
      void promise.track(result);
    }
    // setOpen(false);
    setQuery("");
  };

  const applyMultiOptionZoneClick = (
    e: MouseEvent,
    zone: "avatar" | "right",
    itemId: Id,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    suppressCmdkItemSelectRef.current = true;
    queueMicrotask(() => {
      suppressCmdkItemSelectRef.current = false;
    });
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      handleSelect(xor(value, [itemId]), itemId, "toggle");
      return;
    }
    if (zone === "avatar") {
      handleSelect(xor(value, [itemId]), itemId, "toggle");
      return;
    }
    // zone === "right"
    handleSelect([itemId], itemId, "include");
  };

  const button = (
    <Button
      variant={variant ?? "outline"}
      role="combobox"
      aria-expanded={open}
      className={cn(
        "justify-start *:min-w-0",
        className,
        buttonPaddingVariant({ size }),
      )}
      size={size === "md" ? "default" : size}
      {...rest}
    >
      {rd
        .fullJourney(promise.state)
        .initially(null)
        .wait(<LoaderCircle className="size-3! animate-spin" />)
        .catch(renderSmallError("w-5 h-5"))
        .map(() => null)}
      {rd
        .fullJourney(currentOption)
        .initially(
          <div className="ml-2 truncate min-w-0">
            {config.placeholder ?? "Select item"}
          </div>,
        )
        .wait(<Skeleton className="w-full h-lh" />)
        .catch(renderSmallError("w-full h-lh", "Not found"))
        .map((optionItems) => {
          const unassigned = optionItems.filter(unassignedUtils.isUnassigned);
          const rest = optionItems.filter(unassignedUtils.isAssigned);
          const all = [...unassigned, ...rest];
          const hasOverflow =
            maxValueItems != null && all.length > maxValueItems;
          const toShow = hasOverflow ? [] : all;
          return (
            <>
              {toShow.map((data) => (
                <Fragment
                  key={unassignedUtils.mapOrElse(
                    data as Unassigned | Data,
                    config.getKey,
                    "@@unassigned@@",
                  )}
                >
                  <SimpleTooltip title="Unassigned">
                    {unassignedUtils.mapOrElse(
                      data as Unassigned | Data,
                      partialRight(config.renderItem, _props),
                      value.length > 1 ? (
                        <div
                          className={cn(
                            "truncate min-w-0 flex-row flex gap-2 items-center justify-center size-7 rounded-full bg-accent",
                            "text-accent-foreground",
                          )}
                        >
                          <Unlink2 />
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "ml-2 truncate min-w-0 flex-row flex gap-2 items-center",
                            "text-accent-foreground",
                          )}
                        >
                          <Unlink2 />
                          Unassigned
                        </div>
                      ),
                    )}
                  </SimpleTooltip>
                </Fragment>
              ))}
              {hasOverflow && itemOverflowMessage ? (
                <div className="ml-2 truncate min-w-0 text-muted-foreground text-sm">
                  {itemOverflowMessage(value)}
                </div>
              ) : null}
            </>
          );
        })}
      <ChevronsUpDown className="opacity-50 ml-auto" />
    </Button>
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setExclusiveHoverKey(null);
      }}
    >
      <PopoverTrigger asChild>{button}</PopoverTrigger>
      <PopoverContent className="max-w-md w-fit p-0" align={align} side={side}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={config.searchPlaceholder || "Search item"}
            value={query}
            onValueChange={setQuery}
            endAdornment={
              <div className="flex w-[5.5rem] shrink-0 items-center justify-end">
                {value.length > 0 ? (
                  <button
                    type="button"
                    aria-label="Clear selection"
                    className={cn(
                      "flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium",
                      "text-rose-700 hover:bg-rose-100/80 dark:text-rose-200 dark:hover:bg-rose-900/50",
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect([], null, "clear")}
                  >
                    <X className="size-3.5 shrink-0" />
                    Clear
                  </button>
                ) : null}
              </div>
            }
          />
          <CommandList>
            <CommandGroup className={pickerCommandGroupClassName}>
              <div className={pickerCommandHeaderSlotClassName}>
                {allowUnassigned && (
                  <CommandItem
                    variant="info"
                    value={undefined}
                    onSelect={() => {
                      handleSelect(
                        xor(value, [unassignedUtils.ofUnassigned()]),
                        unassignedUtils.ofUnassigned(),
                        "toggle",
                      );
                    }}
                  >
                    <Unlink2 />
                    {config.unassignedLabel || "Unassigned"}
                    <Check
                      className={cn(
                        "ml-auto",
                        value.includes(unassignedUtils.ofUnassigned())
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                  </CommandItem>
                )}
              </div>
              {rd
                .journey(options)
                .wait(<CommandLoading />)
                .catch((e) => <CommandEmpty>Error: {e.message}</CommandEmpty>)
                .map((options) => {
                  if (options.length === 0) {
                    return <CommandEmpty>Nothing found</CommandEmpty>;
                  }
                  return options.map((data) => {
                    const itemId = config.getItemId(data);
                    const rowKey = config.getKey(data);
                    const isSelected = value.some(
                      (v) => String(v) === String(itemId),
                    );
                    const renderBody = config.renderMultiOption
                      ? config.renderMultiOption(data, {
                          isSelected,
                          itemId,
                          onAvatarClick: (e) =>
                            applyMultiOptionZoneClick(e, "avatar", itemId),
                          onRightPartClick: (e) =>
                            applyMultiOptionZoneClick(e, "right", itemId),
                          trailingSlot: (
                            <Check
                              className={cn(
                                isSelected ? "opacity-100" : "opacity-0",
                              )}
                            />
                          ),
                          onExclusiveZonePointerEnter: () =>
                            setExclusiveHoverKey(rowKey),
                          onExclusiveZonePointerLeave: () =>
                            setExclusiveHoverKey((cur) =>
                              cur === rowKey ? null : cur,
                            ),
                          dimExclusiveStrip:
                            exclusiveHoverKey !== null &&
                            exclusiveHoverKey !== rowKey,
                        })
                      : partialRight(
                          config.renderOption ?? config.renderItem,
                          _props,
                        )(data);

                    const itemsStretch = Boolean(config.renderMultiOption);

                    return (
                      <CommandItem
                        key={rowKey}
                        value={rowKey}
                        className={pickerOptionRowOuterClassName(itemsStretch)}
                        onSelect={() => {
                          if (
                            config.renderMultiOption &&
                            suppressCmdkItemSelectRef.current
                          ) {
                            return;
                          }
                          handleSelect(xor(value, [itemId]), itemId, "toggle");
                        }}
                      >
                        <div
                          className={pickerOptionRowInnerClassName({
                            isSelected,
                            itemsStretch,
                          })}
                        >
                          {renderBody}
                          {!config.renderMultiOption ? (
                            <Check
                              className={cn(
                                "ml-auto shrink-0",
                                isSelected ? "opacity-100" : "opacity-0",
                              )}
                            />
                          ) : null}
                        </div>
                      </CommandItem>
                    );
                  });
                })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
