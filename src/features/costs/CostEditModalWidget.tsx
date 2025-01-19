import { CostPayload } from "@/api/cost/cost.api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { CostForm } from "@/features/costs/CostForm.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithCostService } from "@/services/io/CostService/CostService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { useSubscribedMessage } from "@passionware/messaging-react";

export type CostEditModalWidgetProps = WithServices<
  [
    WithCostService,
    WithClientService,
    WithContractorService,
    WithWorkspaceService,
    WithMessageService,
  ]
>;
export function CostEditModalWidget(props: CostEditModalWidgetProps) {
  const message = useSubscribedMessage(
    props.services.messageService.editCost.subscribeToRequest,
  );
  const handleCancel = () => message?.sendResponse({ action: "cancel" });
  const handleConfirm = (payload: CostPayload, changes: Partial<CostPayload>) =>
    message?.sendResponse({ action: "confirm", payload, changes });

  return (
    <Dialog open={!!message} onOpenChange={handleCancel}>
      <DialogContent>
        <DialogTitle>Edit report</DialogTitle>
        <DialogDescription></DialogDescription>
        <CostForm
          onCancel={handleCancel}
          defaultValues={message?.request.defaultValues}
          services={props.services}
          onSubmit={handleConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}
