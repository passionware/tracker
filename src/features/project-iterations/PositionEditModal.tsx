import { ProjectIterationPositionPayload } from "@/api/project-iteration/project-iteration.api.ts";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { ProjectIterationPositionForm } from "@/features/project-iterations/PositionForm.tsx";
import { useSubscribedMessage } from "@passionware/messaging-react";

export type PositionEditModalProps = WithFrontServices;
export function PositionEditModal(props: PositionEditModalProps) {
  const message = useSubscribedMessage(
    props.services.messageService.editProjectIterationPosition
      .subscribeToRequest,
  );
  const handleCancel = () => message?.sendResponse({ action: "cancel" });
  const handleConfirm = async (
    payload: ProjectIterationPositionPayload,
    changes: Partial<ProjectIterationPositionPayload>,
  ) => message?.sendResponse({ action: "confirm", payload, changes });

  return (
    <Drawer open={!!message} onOpenChange={handleCancel} direction="right">
      <DrawerContent className="inset-y-0 right-0 left-auto h-full w-[min(92vw,980px)] rounded-l-2xl border-l border-border mt-0">
        <DrawerHeader>
          <DrawerTitle>
            {message &&
              (
                {
                  create: "Create position",
                  edit: "Edit position",
                  duplicate: "Duplicate position",
                } as const
              )[message?.request.operatingMode]}
          </DrawerTitle>
          <DrawerDescription />
        </DrawerHeader>
        <div className="px-4 pb-4 overflow-y-auto flex-1">
          {message && (
            <ProjectIterationPositionForm
              currency={message.request.currency}
              mode={message.request.operatingMode}
              onCancel={handleCancel}
              defaultValues={message.request.defaultValues}
              services={props.services}
              onSubmit={handleConfirm}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
