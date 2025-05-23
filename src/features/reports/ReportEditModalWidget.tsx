import { ReportPayload } from "@/api/reports/reports.api.ts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { ReportForm } from "@/features/reports/ReportForm.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithReportService } from "@/services/io/ReportService/ReportService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { useSubscribedMessage } from "@passionware/messaging-react";

export type ReportEditModalWidgetProps = WithServices<
  [
    WithReportService,
    WithClientService,
    WithContractorService,
    WithWorkspaceService,
    WithMessageService,
    WithExpressionService,
    WithFormatService,
  ]
>;
export function ReportEditModalWidget(props: ReportEditModalWidgetProps) {
  const message = useSubscribedMessage(
    props.services.messageService.editReport.subscribeToRequest,
  );
  const handleCancel = () => message?.sendResponse({ action: "cancel" });
  const handleConfirm = (
    payload: ReportPayload,
    changes: Partial<ReportPayload>,
  ) => message?.sendResponse({ action: "confirm", payload, changes });

  return (
    <Dialog open={!!message} onOpenChange={handleCancel}>
      <DialogContent>
        <DialogTitle>
          {message &&
            (
              {
                create: "Create report",
                edit: "Edit report",
                duplicate: "Duplicate report",
              } as const
            )[message?.request.operatingMode]}
        </DialogTitle>
        <DialogDescription></DialogDescription>
        <ReportForm
          onCancel={handleCancel}
          defaultValues={message?.request.defaultValues}
          services={props.services}
          onSubmit={handleConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}
