import { Variable } from "@/api/variable/variable.api.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { VariableForm } from "@/features/variables/VariableForm.tsx";
import { useOpenState } from "@/platform/react/useOpenState.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithVariableService } from "@/services/io/VariableService/VariableService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

export function ActionMenu(
  props: WithServices<
    [
      WithPreferenceService,
      WithClientService,
      WithWorkspaceService,
      WithVariableService,
      WithContractorService,
    ]
  > & {
    entry: Variable;
  },
) {
  const isDangerMode = props.services.preferenceService.useIsDangerMode();
  const editModalState = useOpenState();
  return (
    <>
      <Dialog {...editModalState.dialogProps}>
        <DialogContent>
          <DialogTitle>Edit variable</DialogTitle>
          <DialogDescription></DialogDescription>
          <VariableForm
            onCancel={editModalState.close}
            defaultValues={props.entry}
            services={props.services}
            onSubmit={(data) =>
              props.services.variableService
                .updateVariable(props.entry.id, data)
                .then(editModalState.close)
            }
          />
        </DialogContent>
      </Dialog>
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
          <DropdownMenuItem onClick={editModalState.open} >
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
    </>
  );
}
