import { BillingPayload } from "@/api/billing/billing.api.ts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { BillingForm } from "@/features/billing/BillingForm.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { WithBillingService } from "@/services/io/BillingService/BillingService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { useSubscribedMessage } from "@passionware/messaging-react";

export type BillingEditModalWidgetProps = WithServices<
  [
    WithBillingService,
    WithClientService,
    WithContractorService,
    WithWorkspaceService,
    WithMessageService,
  ]
>;
export function BillingEditModalWidget(props: BillingEditModalWidgetProps) {
  const message = useSubscribedMessage(
    props.services.messageService.editBilling.subscribeToRequest,
  );
  const handleCancel = () => message?.sendResponse({ action: "cancel" });
  const handleConfirm = (
    payload: BillingPayload,
    changes: Partial<BillingPayload>,
  ) => message?.sendResponse({ action: "confirm", payload, changes });

  return (
    <Dialog open={!!message} onOpenChange={handleCancel}>
      <DialogContent>
        <DialogTitle>Edit billing</DialogTitle>
        <DialogDescription></DialogDescription>
        <BillingForm
          onCancel={handleCancel}
          defaultValues={message?.request.defaultValues}
          services={props.services}
          onSubmit={handleConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}
