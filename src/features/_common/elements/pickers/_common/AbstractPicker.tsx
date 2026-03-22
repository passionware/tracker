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
import { renderSmallError } from "@/features/_common/renderError.tsx";
import {
  pickerCommandGroupClassName,
  pickerCommandHeaderSlotClassName,
  pickerOptionRowInnerClassName,
  pickerOptionRowOuterClassName,
} from "@/features/_common/elements/pickers/_common/picker-command-layout.ts";
import { cn } from "@/lib/utils.ts";
import { maybe, Maybe, rd, RemoteData } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Overwrite } from "@passionware/platform-ts";
import { PopoverContentProps } from "@radix-ui/react-popover";
import { cva } from "class-variance-authority";
import { CommandLoading } from "cmdk";
import { partialRight } from "lodash";
import { Check, ChevronsUpDown, LoaderCircle, Unlink2, X } from "lucide-react";
import { ReactNode, useState } from "react";

export interface AbstractPickerConfig<Id, Data, Props> {
  useItem: (id: Maybe<Id>) => RemoteData<Data>;
  useItems: (query: string) => RemoteData<Data[]>;
  renderItem: (item: Unassigned | Data, props: Props) => ReactNode;
  renderOption?: (item: Data) => ReactNode;
  getItemId: (item: Data) => Id;
  getKey: (item: Data) => string;
  unassignedLabel?: ReactNode;
  searchPlaceholder?: string;
  placeholder?: string;
}

export type AbstractPickerProps<Id, Data> = Overwrite<
  ButtonProps,
  {
    size?: "xs" | "sm" | "md" | "lg";
    value: Maybe<Unassigned | Id>;
    onSelect: Maybe<(item: Maybe<Unassigned | Id>) => void | Promise<void>>;
    config: AbstractPickerConfig<Id, Data, AbstractPickerProps<Id, Data>>;
    allowClear?: boolean;
    allowUnassigned?: boolean;
    align?: PopoverContentProps["align"];
    side?: PopoverContentProps["side"];
    layout?: "full" | "avatar";
    placeholder?: string;
    searchable?: boolean;
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

export function AbstractPicker<Id, Data>(
  _props: AbstractPickerProps<Id, Data>,
) {
  const {
    value,
    onSelect,
    config,
    size,
    variant,
    className,
    allowUnassigned,
    allowClear,
    align = "start",
    side = "bottom",
    placeholder,
    searchable = true,
    ...rest
  } = _props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const promise = promiseState.useRemoteData();

  const options = rd.useLastWithPlaceholder(config.useItems(query));
  const lastOption = rd.useLastWithPlaceholder(
    config.useItem(unassignedUtils.getOrElse(value, null)),
  );

  const currentOption = rd.widen<Data | Unassigned>(
    maybe.isAbsent(value)
      ? rd.ofIdle()
      : unassignedUtils.mapOrElse(
          value,
          () => lastOption,
          rd.of(unassignedUtils.ofUnassigned()),
        ),
  );

  const handleSelect = (itemId: Maybe<Unassigned | Id>) => {
    const result = onSelect?.(itemId);
    if (result) {
      void promise.track(result);
    }
    setOpen(false);
    setQuery("");
  };

  const button = (
    <Button
      variant={variant ?? "outline"}
      role="combobox"
      aria-expanded={open}
      className={cn(
        "justify-between *:min-w-0",
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
            {placeholder ?? config.placeholder ?? "Select item"}
          </div>,
        )
        .wait(<Skeleton className="w-full h-lh" />)
        .catch(renderSmallError("w-full h-lh", "Not found"))
        .map((data) =>
          unassignedUtils.mapOrElse(
            data,
            partialRight(config.renderItem, _props),
            <div
              className={cn(
                "ml-2 truncate min-w-0 flex-row flex gap-2 items-center",
                "text-accent-foreground",
              )}
            >
              <Unlink2 />
              Unassigned
            </div>,
          ),
        )}
      <ChevronsUpDown className="opacity-50 " />
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{button}</PopoverTrigger>
      <PopoverContent className="max-w-md w-fit p-0" align={align} side={side}>
        <Command shouldFilter={false}>
          {searchable && (
            <CommandInput
              placeholder={config.searchPlaceholder || "Search item"}
              value={query}
              onValueChange={setQuery}
              endAdornment={
                allowClear ? (
                  <div className="flex w-[5.5rem] shrink-0 items-center justify-end">
                    {maybe.isPresent(value) ? (
                      <button
                        type="button"
                        aria-label="Clear selection"
                        className={cn(
                          "flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium",
                          "text-rose-700 hover:bg-rose-100/80 dark:text-rose-200 dark:hover:bg-rose-900/50",
                        )}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelect(null)}
                      >
                        <X className="size-3.5 shrink-0" />
                        Clear
                      </button>
                    ) : null}
                  </div>
                ) : null
              }
            />
          )}
          <CommandList>
            <CommandGroup className={pickerCommandGroupClassName}>
              <div className={pickerCommandHeaderSlotClassName}>
                {allowClear && maybe.isPresent(value) && !searchable && (
                  <CommandItem
                    value={undefined}
                    onSelect={() => {
                      handleSelect(null);
                    }}
                    variant="danger"
                  >
                    <X />
                    Clear
                  </CommandItem>
                )}
                {allowUnassigned && (
                  <CommandItem
                    variant="info"
                    value={undefined}
                    onSelect={() => {
                      handleSelect(unassignedUtils.ofUnassigned());
                    }}
                  >
                    <Unlink2 />
                    {config.unassignedLabel || "Unassigned"}
                    <Check
                      className={cn(
                        "ml-auto",
                        unassignedUtils.isUnassigned(value)
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
                    const isSelected =
                      maybe.isPresent(value) &&
                      unassignedUtils.isAssigned(value) &&
                      String(value) === String(itemId);
                    return (
                      <CommandItem
                        key={config.getKey(data)}
                        value={config.getKey(data)}
                        className={pickerOptionRowOuterClassName(false)}
                        onSelect={() => {
                          if (value === itemId) {
                            if (allowClear) {
                              handleSelect(null);
                            }
                            setOpen(false);
                            return;
                          }

                          handleSelect(itemId);
                        }}
                      >
                        <div
                          className={pickerOptionRowInnerClassName({
                            isSelected,
                            itemsStretch: false,
                          })}
                        >
                          {partialRight(
                            config.renderOption ?? config.renderItem,
                            _props,
                          )(data)}
                          <Check
                            className={cn(
                              "ml-auto shrink-0",
                              isSelected ? "opacity-100" : "opacity-0",
                            )}
                          />
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
