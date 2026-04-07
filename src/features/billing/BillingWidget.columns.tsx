import {
  ActionMenu,
  ActionMenuCopyItem,
  ActionMenuDeleteItem,
  ActionMenuDuplicateItem,
  ActionMenuEditItem,
  ActionMenuMarkPaidMenuItem,
} from "@/features/_common/ActionMenu.tsx";
import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns.tsx";
import { billingColumns } from "@/features/_common/columns/billing.tsx";
import { BillingWidgetProps } from "@/features/billing/BillingWidget.types.ts";
import { BillingViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";

const columnHelper = createColumnHelper<BillingViewEntry>();
export function useColumns(props: BillingWidgetProps) {
  return [
    ...sharedColumns.getContextual({
      workspaceId: props.workspaceId,
      clientId: props.clientId,
    }),
    billingColumns.invoiceNumber,
    billingColumns.invoiceDate(props.services),
    billingColumns.dueDate(props.services),
    billingColumns.report.linkingStatus.allowModify(props.services),
    billingColumns.netAmount(props.services),
    billingColumns.grossAmount(props.services),
    billingColumns.report.linkedValue(props.services),
    billingColumns.report.remainingValue(props.services),
    billingColumns.paidStatus(props.services),
    sharedColumns.description,
    billingColumns.commitStatus(props.services),
    columnHelper.display({
      id: "actions",
      cell: (info) => (
        <ActionMenu services={props.services}>
          <ActionMenuDeleteItem
            onClick={() => {
              void props.services.mutationService.deleteBilling(
                info.row.original.id,
              );
            }}
          >
            Delete Billing
          </ActionMenuDeleteItem>
          <ActionMenuMarkPaidMenuItem
            billingId={info.row.original.id}
            paidAt={info.row.original.paidAt}
            services={props.services}
          />
          <ActionMenuEditItem
            onClick={async () => {
              const result =
                await props.services.messageService.editBilling.sendRequest({
                  defaultValues: info.row.original.originalBilling,
                  operatingMode: "edit",
                });
              switch (result.action) {
                case "confirm":
                  await props.services.mutationService.editBilling(
                    info.row.original.id,
                    result.changes,
                  );
                  break;
              }
            }}
          >
            Edit Billing
          </ActionMenuEditItem>
          <ActionMenuDuplicateItem
            onClick={async () => {
              const result =
                await props.services.messageService.editBilling.sendRequest({
                  defaultValues: info.row.original.originalBilling,
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
            Duplicate Billing
          </ActionMenuDuplicateItem>
          <ActionMenuCopyItem copyText={info.row.original.id.toString()}>
            Copy billing ID
          </ActionMenuCopyItem>
        </ActionMenu>
      ),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] satisfies ColumnDef<any, any>[];
}
