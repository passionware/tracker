import { VariablePayload } from "@/api/variable/variable.api.ts";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer.tsx";
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
    payload: VariablePayload,
    changes: Partial<VariablePayload>,
  ) => message?.sendResponse({ action: "confirm", payload, changes });

  return (
    <Drawer open={!!message} onOpenChange={handleCancel} direction="right">
      <DrawerContent className="inset-y-0 right-0 left-auto h-full w-[min(92vw,980px)] rounded-l-2xl border-l border-border mt-0">
        <DrawerHeader>
          <DrawerTitle>
            {message &&
              (
                {
                  create: "Create variable",
                  edit: "Edit variable",
                  duplicate: "Duplicate variable",
                } as const
              )[message?.request.operatingMode]}
          </DrawerTitle>
          <DrawerDescription />
        </DrawerHeader>
        <div className="px-4 pb-4 overflow-y-auto flex-1">
          <VariableForm
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
