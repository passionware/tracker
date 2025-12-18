import { DropdownMenuItem } from "@/components/ui/dropdown-menu.tsx";
import {
  ActionMenu,
  ActionMenuCopyItem,
  ActionMenuDeleteItem,
  ActionMenuDuplicateItem,
  ActionMenuEditItem,
} from "@/features/_common/ActionMenu.tsx";
import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns.tsx";
import {
  baseColumnHelper,
  columnHelper,
  reportColumns,
} from "@/features/_common/columns/report.tsx";
import { ReportsWidgetProps } from "@/features/reports/ReportsWidget.types.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { ExternalLink } from "lucide-react";

export function useColumns(props: ReportsWidgetProps) {
  return [
    ...reportColumns.getContextual({
      contractorId: idSpecUtils.ofAll(),
      clientId: props.clientId,
      workspaceId: props.workspaceId,
    }),
    reportColumns.billing.linkingStatus.allowModify(
      props.services,
      props.clientId,
      props.workspaceId,
    ),
    reportColumns.cost.immediateLinkingStatus.allowModify(props.services),
    reportColumns.cost.linkingStatus.read,
    reportColumns.netAmount(props.services),
    reportColumns.quantity(props.services),
    reportColumns.unitPrice(props.services),
    baseColumnHelper.group({
      header: "Charging",
      columns: [
        reportColumns.billing.linkedValue(props.services),
        reportColumns.billing.remainingValue(props.services),
      ],
      meta: {
        headerClassName: "bg-rose-50 border-x border-slate-800/10",
        cellClassName: "bg-rose-50/50 border-x border-slate-800/10",
      },
    }),
    columnHelper.group({
      header: "Compensation",
      columns: [
        reportColumns.cost.linkedValue(props.services),
        reportColumns.cost.immediateRemainingValue(props.services),
        reportColumns.cost.remainingValue(props.services),
      ],
      meta: {
        headerClassName: "bg-lime-50 border-x border-slate-800/10",
        cellClassName: "bg-lime-50/50 border-x border-slate-800/10",
      },
    }),
    reportColumns.period(props.services),
    sharedColumns.description,
    columnHelper.display({
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <ActionMenu services={props.services}>
          <ActionMenuDeleteItem
            onClick={() => {
              void props.services.mutationService.deleteCostReport(
                row.original.id,
              );
            }}
          >
            Delete Report
          </ActionMenuDeleteItem>
          <ActionMenuEditItem
            onClick={async () => {
              const result =
                await props.services.messageService.editReport.sendRequest({
                  defaultValues: row.original.originalReport,
                  operatingMode: "edit",
                });
              switch (result.action) {
                case "confirm":
                  await props.services.mutationService.editReport(
                    row.original.id,
                    result.changes,
                  );
                  break;
              }
            }}
          >
            Edit Report
          </ActionMenuEditItem>
          <ActionMenuDuplicateItem
            onClick={async () => {
              const result =
                await props.services.messageService.editReport.sendRequest({
                  defaultValues: row.original.originalReport,
                  operatingMode: "duplicate",
                });
              switch (result.action) {
                case "confirm":
                  await props.services.mutationService.createReport(
                    result.payload,
                  );
                  break;
              }
            }}
          >
            Duplicate Report
          </ActionMenuDuplicateItem>
          <DropdownMenuItem
            onClick={async () => {
              // calling some action, hopefully it opens a report
              await props.services.expressionService.ensureExpressionValue(
                {
                  clientId: row.original.client.id,
                  contractorId: row.original.contractor.id,
                  workspaceId: row.original.workspace.id,
                },
                "vars.open_report_action", // in the future we will just enable plugin point so user defines what should happen and from where it should be sourced
                {
                  reportStart: row.original.periodStart,
                  reportEnd: row.original.periodEnd,
                },
              );
            }}
          >
            <ExternalLink className="size-4 " />
            Navigate to report
          </DropdownMenuItem>
          <ActionMenuCopyItem copyText={row.id.toString()}>
            Copy report ID
          </ActionMenuCopyItem>
        </ActionMenu>
      ),
    }),
  ];
}
