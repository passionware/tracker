import { ProjectIterationPositionPayload } from "@/api/project-iteration/project-iteration.api.ts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { ProjectIterationPositionForm } from "@/features/projects/iterations/iteration/PositionForm.tsx";
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
    <Dialog open={!!message} onOpenChange={handleCancel}>
      <DialogContent>
        <DialogTitle>
          {" "}
          {message &&
            (
              {
                create: "Create cost",
                edit: "Edit cost",
                duplicate: "Duplicate cost",
              } as const
            )[message?.request.operatingMode]}
        </DialogTitle>
        <DialogDescription></DialogDescription>
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
      </DialogContent>
    </Dialog>
  );
}
