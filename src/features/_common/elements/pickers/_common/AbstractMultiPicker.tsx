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
import { cn } from "@/lib/utils.ts";
import { Maybe, rd, RemoteData } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Overwrite } from "@passionware/platform-ts";
import { PopoverContentProps } from "@radix-ui/react-popover";
import { cva } from "class-variance-authority";
import { CommandLoading } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { partialRight, xor } from "lodash";
import { Check, ChevronsUpDown, LoaderCircle, Unlink2, X } from "lucide-react";
import { Fragment, ReactNode, useState } from "react";

export interface AbstractPickerConfig<Id, Data, Props> {
  useSelectedItems: (ids: Id[]) => RemoteData<Data[]>;
  useItems: (query: string) => RemoteData<Data[]>;
  renderItem: (item: Unassigned | Data, props: Props) => ReactNode;
  renderOption?: (item: Data) => ReactNode;
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
    ...rest
  } = _props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const promise = promiseState.useRemoteData();

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
        .wait(<LoaderCircle className="!size-3 animate-spin" />)
        .catch(renderSmallError("w-5 h-5"))
        .map(() => null)}
      {rd
        .fullJourney(currentOption)
        .initially(
          <div className="ml-2 truncate min-w-0">
            {config.placeholder ?? "Select item"}
          </div>,
        )
        .wait(<Skeleton className="w-full h-[1lh]" />)
        .catch(renderSmallError("w-full h-[1lh]", "Not found"))
        .map((optionItems) => {
          const unassigned = optionItems.filter(unassignedUtils.isUnassigned);
          const rest = optionItems.filter(unassignedUtils.isAssigned);
          return [...unassigned, ...rest].map((data) => (
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
                        "truncate min-w-0 flex-row flex gap-2 items-center justify-center size-7 rounded-full bg-slate-100",
                        "text-sky-800 dark:text-sky-50 ",
                      )}
                    >
                      <Unlink2 />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "ml-2 truncate min-w-0 flex-row flex gap-2 items-center",
                        "text-sky-800 dark:text-sky-50 ",
                      )}
                    >
                      <Unlink2 />
                      Unassigned
                    </div>
                  ),
                )}
              </SimpleTooltip>
            </Fragment>
          ));
        })}
      <ChevronsUpDown className="opacity-50 ml-auto" />
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{button}</PopoverTrigger>
      <PopoverContent className="max-w-md w-fit p-0" align={align} side={side}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={config.searchPlaceholder || "Search item"}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandGroup>
              <div className="border-b pb-1 mb-1 space-y-1 empty:hidden">
                <AnimatePresence initial={false}>
                  {value.length > 0 && (
                    <motion.div
                      layout
                      key="clear-button"
                      initial={{ opacity: 0, y: -30, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -30, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CommandItem
                        value={undefined}
                        onSelect={() => {
                          handleSelect([], null, "clear");
                        }}
                        variant="danger"
                      >
                        <X />
                        Clear
                      </CommandItem>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                    return (
                      <CommandItem
                        key={config.getKey(data)}
                        value={config.getKey(data)}
                        onSelect={() => {
                          handleSelect(xor(value, [itemId]), itemId, "toggle");
                          // setOpen(false);
                        }}
                      >
                        {partialRight(
                          config.renderOption ?? config.renderItem,
                          _props,
                        )(data)}
                        <Check
                          className={cn(
                            "ml-auto",
                            value.includes(itemId)
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
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
