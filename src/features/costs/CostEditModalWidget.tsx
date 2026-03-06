import { CostPayload } from "@/api/cost/cost.api";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer.tsx";
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
    <Drawer open={!!message} onOpenChange={handleCancel} direction="right">
      <DrawerContent className="inset-y-0 right-0 left-auto h-full w-[min(92vw,980px)] rounded-l-2xl border-l border-border mt-0">
        <DrawerHeader>
          <DrawerTitle>
            {message &&
              (
                {
                  create: "Create cost",
                  edit: "Edit cost",
                  duplicate: "Duplicate cost",
                } as const
              )[message?.request.operatingMode]}
          </DrawerTitle>
          <DrawerDescription />
        </DrawerHeader>
        <div className="px-4 pb-4 overflow-y-auto flex-1">
          <CostForm
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
