import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { foreignColumns } from "@/features/_common/columns/foreign.tsx";
import {
  baseColumnHelper,
  columnHelper,
  reportColumns,
} from "@/features/_common/columns/report.tsx";
import { TruncatedMultilineText } from "@/features/_common/TruncatedMultilineText.tsx";
import { ReportsWidgetProps } from "@/features/reports/ReportsWidget.types.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
import { ReportViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

export function useColumns(props: ReportsWidgetProps) {
  return [
    ...reportColumns.getContextual({
      contractorId: idSpecUtils.ofAll(),
      clientId: props.clientId,
      workspaceId: props.workspaceId,
    }),
    reportColumns.billing.linkingStatus.allowModify(props.services),
    reportColumns.cost.immediateLinkingStatus.allowModify(props.services),
    reportColumns.cost.linkingStatus.read,
    reportColumns.netAmount(props.services),
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
    foreignColumns.description,
    columnHelper.display({
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <ActionMenu services={props.services} entry={row.original} />
      ),
    }),
  ];
}

function ActionMenu(
  props: WithServices<
    [
      WithPreferenceService,
      WithMutationService,
      WithClientService,
      WithContractorService,
      WithWorkspaceService,
      WithMessageService,
      WithExpressionService,
    ]
  > & {
    entry: ReportViewEntry;
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
              void props.services.mutationService.deleteCostReport(
                props.entry.id,
              );
            }}
          >
            <Trash2 />
            Delete Report
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={async () => {
            const result =
              await props.services.messageService.editReport.sendRequest({
                defaultValues: props.entry.originalReport,
              });
            switch (result.action) {
              case "confirm":
                await props.services.mutationService.editReport(
                  props.entry.id,
                  result.changes,
                );
                break;
            }
          }}
        >
          <Pencil />
          Edit Report
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            // calling some action, hopefully it opens a report
            await props.services.expressionService.ensureExpressionValue(
              {
                clientId: props.entry.client.id,
                contractorId: props.entry.contractor.id,
                workspaceId: props.entry.workspace.id,
              },
              "vars.open_report_action", // in the future we will just enable plugin point so user defines what should happen and from where it should be sourced
              {
                reportStart: props.entry.periodStart,
                reportEnd: props.entry.periodEnd,
              },
            );
          }}
        >
          Navigate to report
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            navigator.clipboard.writeText(props.entry.id.toString())
          }
        >
          Copy report ID
        </DropdownMenuItem>
        {/*<DropdownMenuSeparator />*/}
        {/*<DropdownMenuItem>View customer</DropdownMenuItem>*/}
        {/*<DropdownMenuItem>View payment details</DropdownMenuItem>*/}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
