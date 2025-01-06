import { workspaceQueryUtils } from "@/api/workspace/workspace.api.ts";
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
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { Maybe, rd } from "@passionware/monads";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

export interface WorkspacePickerProps {
  value: Maybe<number>;
  onSelect: (workspaceId: number) => void;
  services: WithWorkspaceService;
}

export function WorkspacePicker({
  value,
  onSelect,
  services,
}: WorkspacePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const options = rd.useLastWithPlaceholder(
    services.workspaceService.useWorkspaces(
      workspaceQueryUtils.setSearch(workspaceQueryUtils.ofEmpty(), query),
    ),
  );
  const currentOption = rd.useLastWithPlaceholder(
    services.workspaceService.useWorkspace(value),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open}>
          {rd
            .fullJourney(currentOption)
            .initially("Select workspace...")
            .wait(<Skeleton className="w-full h-[1lh]" />)
            .catch(renderSmallError("w-full h-[1lh]"))
            .map((workspace) => workspace.name)}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-md w-fit p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search workspace"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandGroup>
              {rd
                .journey(options)
                .wait(<span>Loading...</span>)
                .catch((e) => <CommandEmpty>Error: {e.message}</CommandEmpty>)
                .map((workspaces) => {
                  if (workspaces.length === 0) {
                    return <CommandEmpty>No workspaces found.</CommandEmpty>;
                  }
                  return workspaces.map((workspace) => (
                    <CommandItem
                      key={workspace.id}
                      value={workspace.id.toString()}
                      onSelect={() => {
                        onSelect(workspace.id);
                        setOpen(false);
                      }}
                    >
                      {workspace.name}
                      <Check
                        className={cn(
                          "ml-auto",
                          value === workspace.id ? "opacity-100" : "opacity-0",
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
