import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { billingColumns } from "@/features/_common/columns/billing.tsx";
import { foreignColumns } from "@/features/_common/columns/foreign.tsx";
import { BillingWidgetProps } from "@/features/billing/BillingWidget.types.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { BillingViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

const columnHelper = createColumnHelper<BillingViewEntry>();
export function useColumns(props: BillingWidgetProps) {
  return [
    ...foreignColumns.getContextual({
      workspaceId: props.workspaceId,
      clientId: props.clientId,
    }),
    billingColumns.invoiceNumber,
    billingColumns.invoiceDate(props.services),
    billingColumns.report.linkingStatus.allowModify(props.services),
    billingColumns.netAmount(props.services),
    billingColumns.grossAmount(props.services),
    billingColumns.report.linkedValue(props.services),
    billingColumns.report.remainingValue(props.services),
    foreignColumns.description,
    columnHelper.display({
      id: "actions",
      cell: (info) => (
        <ActionMenu entry={info.row.original} services={props.services} />
      ),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] satisfies ColumnDef<any, any>[];
}

function ActionMenu(
  props: WithServices<
    [
      WithPreferenceService,
      WithMutationService,
      WithClientService,
      WithWorkspaceService,
      WithMessageService,
    ]
  > & {
    entry: BillingViewEntry;
  },
) {
  const isDangerMode = props.services.preferenceService.useIsDangerMode();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        {isDangerMode && (
          <DropdownMenuItem
            onClick={() => {
              void props.services.mutationService.deleteBilling(props.entry.id);
            }}
          >
            <Trash2 />
            Delete Billing
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={async () => {
            const result =
              await props.services.messageService.editBilling.sendRequest({
                defaultValues: props.entry.originalBilling,
                operatingMode: "edit",
              });
            switch (result.action) {
              case "confirm":
                await props.services.mutationService.editBilling(
                  props.entry.id,
                  result.changes,
                );
                break;
            }
          }}
        >
          <Pencil />
          Edit Billing
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            const result =
              await props.services.messageService.editBilling.sendRequest({
                defaultValues: props.entry.originalBilling,
                operatingMode: "duplicate",
              });
            switch (result.action) {
              case "confirm":
                await props.services.mutationService.createBilling(
                  result.payload,
                );
                break;
            }
          }}
        >
          <Copy />
          Duplicate Billing
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            navigator.clipboard.writeText(props.entry.id.toString())
          }
        >
          Copy billing ID
        </DropdownMenuItem>
        {/*<DropdownMenuSeparator />*/}
        {/*<DropdownMenuItem>View customer</DropdownMenuItem>*/}
        {/*<DropdownMenuItem>View payment details</DropdownMenuItem>*/}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
