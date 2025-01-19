import { VariablePayload } from "@/api/variable/variable.api.ts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { VariableForm } from "@/features/variables/VariableForm.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithVariableService } from "@/services/io/VariableService/VariableService";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { useSubscribedMessage } from "@passionware/messaging-react";

export type VariableEditModalWidgetProps = WithServices<
  [
    WithVariableService,
    WithClientService,
    WithContractorService,
    WithWorkspaceService,
    WithMessageService,
  ]
>;
export function VariableEditModalWidget(props: VariableEditModalWidgetProps) {
  const message = useSubscribedMessage(
    props.services.messageService.editVariable.subscribeToRequest,
  );
  const handleCancel = () => message?.sendResponse({ action: "cancel" });
  const handleConfirm = (
    variable: VariablePayload,
    changes: Partial<VariablePayload>,
  ) => message?.sendResponse({ action: "confirm", variable, changes });

  return (
    <Dialog open={!!message} onOpenChange={handleCancel}>
      <DialogContent>
        <DialogTitle>Edit variable</DialogTitle>
        <DialogDescription></DialogDescription>
        <VariableForm
          onCancel={handleCancel}
          defaultValues={message?.request.defaultValues}
          services={props.services}
          onSubmit={handleConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}
