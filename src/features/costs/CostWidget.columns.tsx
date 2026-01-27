import {
  ActionMenu,
  ActionMenuCopyItem,
  ActionMenuDeleteItem,
  ActionMenuDuplicateItem,
  ActionMenuEditItem,
} from "@/features/_common/ActionMenu.tsx";
import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns.tsx";
import { costColumns } from "@/features/_common/columns/cost.tsx";
import { PotentialCostWidgetProps } from "@/features/costs/CostWidget.types.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { CostEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { createColumnHelper } from "@tanstack/react-table";

const columnHelper = createColumnHelper<CostEntry>();

export function useColumns(props: PotentialCostWidgetProps) {
  return [
    ...sharedColumns.getContextual({
      workspaceId: props.workspaceId,
      contractorId: idSpecUtils.ofAll(),
    }),
    costColumns.counterparty,
    costColumns.invoiceNumber,
    costColumns.invoiceDate(props.services),
    costColumns.netAmount(props.services),
    costColumns.grossAmount(props.services),
    costColumns.report.linkStatus.allowModify(
      props.services,
      props.clientId,
      props.workspaceId,
    ),
    costColumns.report.linkedValue(props.services),
    costColumns.report.remainingValue(props.services),
    sharedColumns.description,
    costColumns.commitStatus(props.services),
    columnHelper.display({
      id: "actions",
      cell: (info) => (
        <ActionMenu services={props.services}>
          <ActionMenuDeleteItem
            onClick={() => {
              void props.services.mutationService.deleteCost(
                info.row.original.id,
              );
            }}
          >
            Delete Cost
          </ActionMenuDeleteItem>
          <ActionMenuEditItem
            onClick={async () => {
              const result =
                await props.services.messageService.editCost.sendRequest({
                  defaultValues: info.row.original.originalCost,
                  operatingMode: "edit",
                });
              switch (result.action) {
                case "confirm":
                  await props.services.mutationService.editCost(
                    info.row.original.id,
                    result.changes,
                  );
                  break;
                case "cancel":
                  break;
              }
            }}
          >
            Edit Cost
          </ActionMenuEditItem>
          <ActionMenuDuplicateItem
            onClick={async () => {
              const result =
                await props.services.messageService.editCost.sendRequest({
                  defaultValues: info.row.original.originalCost,
                  operatingMode: "duplicate",
                });
              switch (result.action) {
                case "confirm":
                  await props.services.mutationService.createCost(
                    result.payload,
                  );
                  break;
                case "cancel":
                  break;
              }
            }}
          >
            Duplicate Cost
          </ActionMenuDuplicateItem>
          <ActionMenuCopyItem copyText={info.row.original.id.toString()}>
            Copy cost ID
          </ActionMenuCopyItem>
        </ActionMenu>
      ),
    }),
  ];
}
