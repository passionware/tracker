import { clientQueryUtils } from "@/api/clients/clients.api.ts";
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
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import {Maybe, rd} from "@passionware/monads";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

export interface ClientPickerProps {
  value: Maybe<number>;
  onSelect: (clientId: number) => void;
  services: WithClientService;
}

export function ClientPicker({ value, onSelect, services }: ClientPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const options = rd.useLastWithPlaceholder(
    services.clientService.useClients(
      clientQueryUtils.setSearch(clientQueryUtils.ofEmpty(), query),
    ),
  );
  const currentOption = rd.useLastWithPlaceholder(
    services.clientService.useClient(value),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open}>
          {rd
            .fullJourney(currentOption)
            .initially("Select client...")
            .wait(<Skeleton className="w-full h-[1lh]" />)
            .catch(renderSmallError("w-full h-[1lh]"))
            .map((client) => client.name)}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-md w-fit p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search client"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandGroup>
              {rd
                .journey(options)
                .wait(<span>Loading...</span>)
                .catch((e) => <CommandEmpty>Error: {e.message}</CommandEmpty>)
                .map((clients) => {
                  if (clients.length === 0) {
                    return <CommandEmpty>No clients found.</CommandEmpty>;
                  }
                  return clients.map((client) => (
                    <CommandItem
                      key={client.id}
                      value={client.id.toString()}
                      onSelect={() => {
                        onSelect(client.id);
                        setOpen(false);
                      }}
                    >
                      {client.name}
                      <Check
                        className={cn(
                          "ml-auto",
                          value === client.id ? "opacity-100" : "opacity-0",
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
