import {
  Unassigned,
  unassignedUtils,
} from "@/api/_common/query/filters/Unassigned.ts";
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
import { promiseState } from "@passionware/platform-react";
import { CommandLoading } from "cmdk";
import { Check, ChevronsUpDown, Unlink2, X } from "lucide-react";
import { useState } from "react";

export interface ContractorPickerProps
  extends WithServices<[WithContractorService]> {
  value: Maybe<Unassigned | Contractor["id"]>;
  onSelect: Maybe<
    (contractorId: Maybe<Unassigned | Contractor["id"]>) => void | Promise<void>
  >;
  allowClear?: boolean;
  allowUnassigned?: boolean;
  size?: ButtonProps["size"];
  className?: string;
}

export function ContractorPicker(props: ContractorPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const promise = promiseState.useRemoteData();

  const options = rd.useLastWithPlaceholder(
    props.services.contractorService.useContractors(
      contractorQueryUtils.setSearch(contractorQueryUtils.ofEmpty(), query),
    ),
  );
  const lastOption = rd.useLastWithPlaceholder(
    props.services.contractorService.useContractor(
      unassignedUtils.getOrElse(props.value, null),
    ),
  );

  const currentOption = rd.widen<Contractor | Unassigned>(
    maybe.isAbsent(props.value)
      ? rd.ofIdle()
      : unassignedUtils.mapOrElse(
          props.value,
          () => lastOption,
          rd.of(unassignedUtils.ofUnassigned()),
        ),
  );

  const handleSelect = (contractorId: Maybe<Unassigned | Contractor["id"]>) => {
    const result = props.onSelect?.(contractorId);
    if (result) {
      promise.track(result);
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
      className={cn("justify-between", props.className)}
    >
      {rd
        .fullJourney(currentOption)
        .initially("Select contractor...")
        .wait(<Skeleton className="w-full h-[1lh]" />)
        .catch(renderSmallError("w-full h-[1lh]", "Not found"))
        .map((contractor) =>
          unassignedUtils.mapOrElse(
            contractor,
            (c) => c.fullName,
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
                        handleSelect(null);
                      }}
                      variant="danger"
                    >
                      <X />
                      Clear
                    </CommandItem>
                  </>
                )}
                {props.allowUnassigned && (
                  <>
                    <CommandItem
                      variant="info"
                      value={undefined}
                      onSelect={() => {
                        handleSelect(unassignedUtils.ofUnassigned());
                      }}
                    >
                      <Unlink2 />
                      Unassigned
                      <Check
                        className={cn(
                          "ml-auto",
                          unassignedUtils.isUnassigned(props.value)
                            ? "opacity-100"
                            : "opacity-0",
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
                            handleSelect(null);
                          }
                          setOpen(false);
                          return;
                        }

                        handleSelect(contractor.id);
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
