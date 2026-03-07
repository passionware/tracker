import { ReportPayload } from "@/api/reports/reports.api.ts";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer.tsx";
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
    <Drawer open={!!message} onOpenChange={handleCancel} direction="right">
      <DrawerContent className="inset-y-0 right-0 left-auto h-full w-[min(92vw,980px)] rounded-l-2xl border-l border-border mt-0">
        <DrawerHeader>
          <DrawerTitle>
            {message &&
              (
                {
                  create: "Create report",
                  edit: "Edit report",
                  duplicate: "Duplicate report",
                } as const
              )[message?.request.operatingMode]}
          </DrawerTitle>
          <DrawerDescription />
        </DrawerHeader>
        <div className="px-4 pb-4 overflow-y-auto flex-1">
          <ReportForm
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
