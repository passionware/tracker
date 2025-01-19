import {
  Unassigned,
  unassignedUtils,
} from "@/api/_common/query/filters/Unassigned.ts";
import { Client, clientQueryUtils } from "@/api/clients/clients.api.ts";
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
import { ClientView } from "@/features/_common/ClientView.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { cn } from "@/lib/utils.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { maybe, Maybe, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { CommandLoading } from "cmdk";
import { Check, ChevronsUpDown, LoaderCircle, Unlink2, X } from "lucide-react";
import { useState } from "react";

export interface ClientPickerProps extends WithServices<[WithClientService]> {
  value: Maybe<number>;
  onSelect: Maybe<(clientId: Maybe<number>) => void | Promise<void>>;
  allowClear?: boolean;
  allowUnassigned?: boolean;
  size?: ButtonProps["size"];
  className?: string;
}

export function ClientPicker(props: ClientPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const promise = promiseState.useRemoteData();

  const options = rd.useLastWithPlaceholder(
    props.services.clientService.useClients(
      clientQueryUtils.setSearch(clientQueryUtils.ofEmpty(), query),
    ),
  );

  const lastOption = rd.useLastWithPlaceholder(
    props.services.clientService.useClient(
      unassignedUtils.getOrElse(props.value, null),
    ),
  );

  const currentOption = rd.widen<Client | Unassigned>(
    maybe.isAbsent(props.value)
      ? rd.ofIdle()
      : unassignedUtils.mapOrElse(
          props.value,
          () => lastOption,
          rd.of(unassignedUtils.ofUnassigned()),
        ),
  );

  const handleSelect = (clientId: Maybe<number>) => {
    const result = props.onSelect?.(clientId);
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
      className={cn("justify-between", props.className)}
    >
      {rd
        .fullJourney(promise.state)
        .initially(null)
        .wait(<LoaderCircle className="!size-3 animate-spin" />)
        .catch(renderSmallError("w-5 h-5"))
        .map(() => null)}
      {rd
        .fullJourney(currentOption)
        .initially("Select contractor...")
        .wait(<Skeleton className="w-full h-[1lh]" />)
        .catch(renderSmallError("w-full h-[1lh]", "Not found"))
        .map((contractor) =>
          unassignedUtils.mapOrElse(
            contractor,
            (c) => <ClientView client={rd.of(c)} />,
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
            placeholder="Search client"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandGroup>
              <div className="border-b pb-1 mb-1 space-y-1">
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
                    Unassigned
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
                .map((clients) => {
                  if (clients.length === 0) {
                    return <CommandEmpty>No clients found.</CommandEmpty>;
                  }
                  return clients.map((client) => (
                    <CommandItem
                      key={client.id}
                      value={client.id.toString()}
                      onSelect={() => {
                        if (props.value === client.id) {
                          if (props.allowClear) {
                            handleSelect(null);
                          }
                          setOpen(false);
                          return;
                        }

                        handleSelect(client.id);
                        setOpen(false);
                      }}
                    >
                      {client.name}
                      <Check
                        className={cn(
                          "ml-auto",
                          props.value === client.id
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
