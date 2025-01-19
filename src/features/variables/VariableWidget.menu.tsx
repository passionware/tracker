import { Variable } from "@/api/variable/variable.api.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithVariableService } from "@/services/io/VariableService/VariableService.ts";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

export function ActionMenu(
  props: WithServices<
    [WithPreferenceService, WithVariableService, WithMessageService]
  > & {
    entry: Variable;
  },
) {
  const isDangerMode = props.services.preferenceService.useIsDangerMode();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        {isDangerMode && (
          <DropdownMenuItem
            onClick={() => {
              void props.services.variableService.deleteVariable(
                props.entry.id,
              );
            }}
          >
            <Trash2 />
            Delete Variable
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={async () => {
            const result =
              await props.services.messageService.editVariable.sendRequest({
                defaultValues: props.entry,
              });
            switch (result.action) {
              case "confirm":
                await props.services.variableService.updateVariable(
                  props.entry.id,
                  result.changes,
                );
                break;
              case "cancel":
                break;
            }
          }}
        >
          <Pencil />
          Edit Variable
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            navigator.clipboard.writeText(props.entry.id.toString())
          }
        >
          Copy variable ID
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
