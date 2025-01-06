import {
  Contractor,
  contractorQueryUtils,
} from "@/api/contractor/contractor.api.ts";
import { Button } from "@/components/ui/button.tsx";
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
import { ensureError } from "@/platform/lang/ensureError.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { Maybe, rd } from "@passionware/monads";
import { CommandLoading } from "cmdk";
import { Check, ChevronsUpDown } from "lucide-react";
import { ReactElement, useState } from "react";

export interface ContractorPickerProps
  extends WithServices<[WithContractorService]> {
  value: Maybe<Contractor["id"]>;
  onSelect: (contractorId: Contractor["id"]) => void;
  onClear: () => void;
  allowClear?: boolean;
  children: ReactElement;
}

export function ContractorPicker(props: ContractorPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const options = props.services.contractorService.useContractors(
    contractorQueryUtils.setSearch(contractorQueryUtils.ofEmpty(), query),
  );
  const curentOption = props.services.contractorService.useContractor(
    props.value,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {rd
            .fullJourney(curentOption)
            .initially("select contractor...")
            .wait(<Skeleton className="w-full h-[1lh]" />)
            .catch(renderSmallError("w-full h-[1lh]", "Not found"))
            .map((contractor) => contractor.fullName)}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-md w-fit p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search contractor"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No framework found.</CommandEmpty>
            <CommandGroup>
              {rd
                .journey(options)
                .wait(<CommandLoading />)
                .catch((e) => (
                  <CommandEmpty>Error: {ensureError(e).message}</CommandEmpty>
                ))
                .map((options) => {
                  if (options.length === 0) {
                    return <CommandEmpty>No contractor found.</CommandEmpty>;
                  }
                  return options.map((contractor) => (
                    <CommandItem
                      key={contractor.id}
                      value={contractor.id.toString()}
                      onSelect={() => {
                        props.onSelect(contractor.id);
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
