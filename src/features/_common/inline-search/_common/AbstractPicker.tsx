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
import { cn } from "@/lib/utils.ts";
import { maybe, Maybe, rd, RemoteData } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { CommandLoading } from "cmdk";
import { partialRight } from "lodash";
import { Check, ChevronsUpDown, LoaderCircle, Unlink2, X } from "lucide-react";
import { ReactNode, useState } from "react";

export interface AbstractPickerConfig<Id, Data, Props> {
  useItem: (id: Maybe<Id>) => RemoteData<Data>;
  useItems: (query: string) => RemoteData<Data[]>;
  renderItem: (item: Data, props: Props) => ReactNode;
  renderOption?: (item: Data) => ReactNode;
  getItemId: (item: Data) => Id;
  getKey: (item: Data) => string;
  unassignedLabel?: ReactNode;
  searchPlaceholder?: string;
  placeholder?: string;
}

export interface AbstractPickerProps<Id, Data> {
  value: Maybe<Unassigned | Id>;
  onSelect: Maybe<(item: Maybe<Unassigned | Id>) => void | Promise<void>>;
  config: AbstractPickerConfig<Id, Data, AbstractPickerProps<Id, Data>>;
  allowClear?: boolean;
  allowUnassigned?: boolean;
  size?: ButtonProps["size"];
  className?: string;
}

export function AbstractPicker<Id, Data>(props: AbstractPickerProps<Id, Data>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const promise = promiseState.useRemoteData();

  const options = rd.useLastWithPlaceholder(props.config.useItems(query));
  const lastOption = rd.useLastWithPlaceholder(
    props.config.useItem(unassignedUtils.getOrElse(props.value, null)),
  );

  const currentOption = rd.widen<Data | Unassigned>(
    maybe.isAbsent(props.value)
      ? rd.ofIdle()
      : unassignedUtils.mapOrElse(
          props.value,
          () => lastOption,
          rd.of(unassignedUtils.ofUnassigned()),
        ),
  );

  const handleSelect = (itemId: Maybe<Unassigned | Id>) => {
    const result = props.onSelect?.(itemId);
    if (result) {
      void promise.track(result);
    }
    setOpen(false);
    setQuery("");
  };

  const button = (
    <Button
      size={props.size}
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className={cn("pl-1 pr-2 justify-between", props.className)}
    >
      {rd
        .fullJourney(promise.state)
        .initially(null)
        .wait(<LoaderCircle className="!size-3 animate-spin" />)
        .catch(renderSmallError("w-5 h-5"))
        .map(() => null)}
      {rd
        .fullJourney(currentOption)
        .initially(props.config.placeholder ?? "Select item")
        .wait(<Skeleton className="w-full h-[1lh]" />)
        .catch(renderSmallError("w-full h-[1lh]", "Not found"))
        .map((data) =>
          unassignedUtils.mapOrElse(
            data,
            partialRight(props.config.renderItem, props),
            <>
              <Unlink2 />
              Unassigned
            </>,
          ),
        )}
      <ChevronsUpDown className="opacity-50" />
    </Button>
  );

  if (!props.onSelect) {
    return button;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{button}</PopoverTrigger>
      <PopoverContent className="max-w-md w-fit p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={props.config.searchPlaceholder || "Search item"}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandGroup>
              <div className="border-b pb-1 mb-1 space-y-1 empty:hidden">
                {props.allowClear && maybe.isPresent(props.value) && (
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
                {props.allowUnassigned && (
                  <CommandItem
                    variant="info"
                    value={undefined}
                    onSelect={() => {
                      handleSelect(null);
                    }}
                  >
                    <Unlink2 />
                    {props.config.unassignedLabel || "Unassigned"}
                    <Check
                      className={cn(
                        "ml-auto",
                        props.value === null ? "opacity-100" : "opacity-0",
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
                  return options.map((data) => (
                    <CommandItem
                      key={props.config.getKey(data)}
                      value={props.config.getKey(data)}
                      onSelect={() => {
                        if (props.value === props.config.getItemId(data)) {
                          if (props.allowClear) {
                            handleSelect(null);
                          }
                          setOpen(false);
                          return;
                        }

                        handleSelect(props.config.getItemId(data));
                        setOpen(false);
                      }}
                    >
                      {partialRight(
                        props.config.renderOption ?? props.config.renderItem,
                        props,
                      )(data)}
                      <Check
                        className={cn(
                          "ml-auto",
                          props.value === props.config.getItemId(data)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ));
                })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
