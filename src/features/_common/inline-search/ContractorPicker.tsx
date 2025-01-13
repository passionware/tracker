import {
  Contractor,
  contractorQueryUtils,
} from "@/api/contractor/contractor.api.ts";
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
import { WithServices } from "@/platform/typescript/services.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { maybe, Maybe, rd } from "@passionware/monads";
import { CommandLoading } from "cmdk";
import { Check, ChevronsUpDown, Unlink2, X } from "lucide-react";
import { useState } from "react";

export const none = Symbol("none");
export type None = typeof none;

export interface ContractorPickerProps
  extends WithServices<[WithContractorService]> {
  value: Maybe<None | Contractor["id"]>;
  onSelect: Maybe<(contractorId: Maybe<None | Contractor["id"]>) => void>;
  allowClear?: boolean;
  allowNone?: boolean;
  size?: ButtonProps["size"];
  className?: string;
}

export function ContractorPicker(props: ContractorPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const options = rd.useLastWithPlaceholder(
    props.services.contractorService.useContractors(
      contractorQueryUtils.setSearch(contractorQueryUtils.ofEmpty(), query),
    ),
  );
  const lastOption = rd.useLastWithPlaceholder(
    props.services.contractorService.useContractor(
      props.value === none ? null : props.value,
    ),
  );

  const currentOption = rd.widen<Contractor | None>(
    maybe.isAbsent(props.value)
      ? rd.ofIdle()
      : props.value === none
        ? rd.of(none)
        : lastOption,
  );

  const button = (
    <Button
      size={props.size}
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className={cn("justify-between", props.className)}
    >
      {rd
        .fullJourney(currentOption)
        .initially("Select contractor...")
        .wait(<Skeleton className="w-full h-[1lh]" />)
        .catch(renderSmallError("w-full h-[1lh]", "Not found"))
        .map((contractor) => {
          if (contractor === none) {
            return (
              <>
                <Unlink2 />
                Unassigned
              </>
            );
          }
          return contractor.fullName;
        })}
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
            placeholder="Search contractor"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandGroup>
              <div className="border-b pb-1 mb-1 space-y-1">
                {props.allowClear && maybe.isPresent(props.value) && (
                  <>
                    <CommandItem
                      value={undefined}
                      onSelect={() => {
                        props.onSelect?.(null);
                        setQuery("");
                        setOpen(false);
                      }}
                      variant="danger"
                    >
                      <X />
                      Clear
                    </CommandItem>
                  </>
                )}
                {props.allowNone && (
                  <>
                    <CommandItem
                      variant="info"
                      value={undefined}
                      onSelect={() => {
                        props.onSelect?.(none);
                        setQuery("");
                        setOpen(false);
                      }}
                    >
                      <Unlink2 />
                      Unassigned
                      <Check
                        className={cn(
                          "ml-auto",
                          props.value === none ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  </>
                )}
              </div>
              {rd
                .journey(options)
                .wait(<CommandLoading />)
                .catch((e) => <CommandEmpty>Error: {e.message}</CommandEmpty>)
                .map((options) => {
                  if (options.length === 0) {
                    return <CommandEmpty>No contractor found.</CommandEmpty>;
                  }
                  return options.map((contractor) => (
                    <CommandItem
                      key={contractor.id}
                      value={contractor.id.toString()}
                      onSelect={() => {
                        if (props.value === contractor.id) {
                          if (props.allowClear) {
                            props.onSelect?.(null);
                            setQuery("");
                          }
                          setOpen(false);
                          return;
                        }

                        props.onSelect?.(contractor.id);
                        setOpen(false);
                      }}
                    >
                      {contractor.fullName}
                      <Check
                        className={cn(
                          "ml-auto",
                          props.value === contractor.id
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
