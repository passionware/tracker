import { BillingInvoicePayload } from "@/api/billing/billing.api.ts";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer.tsx";
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
    payload: BillingInvoicePayload,
    changes: Partial<BillingInvoicePayload>,
  ) => message?.sendResponse({ action: "confirm", payload, changes });

  return (
    <Drawer open={!!message} onOpenChange={handleCancel} direction="right">
      <DrawerContent className="inset-y-0 right-0 left-auto h-full w-[min(92vw,980px)] rounded-l-2xl border-l border-border mt-0">
        <DrawerHeader>
          <DrawerTitle>
            {message &&
              (
                {
                  create: "Create billing",
                  edit: "Edit billing",
                  duplicate: "Duplicate billing",
                } as const
              )[message?.request.operatingMode]}
          </DrawerTitle>
          <DrawerDescription />
        </DrawerHeader>
        <div className="px-4 pb-4 overflow-y-auto flex-1">
          <BillingForm
            onCancel={handleCancel}
            defaultValues={message?.request.defaultValues}
            services={props.services}
            onSubmit={handleConfirm}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
