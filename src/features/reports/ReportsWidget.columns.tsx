import { RollingBadge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import {
  baseColumnHelper,
  columnHelper,
  reportColumns,
} from "@/features/_common/columns/report.tsx";
import { ReportCostInfo } from "@/features/_common/info/ReportCostInfo.tsx";
import { TruncatedMultilineText } from "@/features/_common/TruncatedMultilineText.tsx";
import { headers } from "@/features/reports/headers.tsx";
import { ReportsWidgetProps } from "@/features/reports/ReportsWidget.types.tsx";
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
    reportColumns.workspace,
    reportColumns.contractor.withAdjacency,
    reportColumns.client,
    reportColumns.billing.linkingStatus.allowModify(props.services),
    columnHelper.accessor("instantEarnings", {
      header: "Instant earn",
      meta: {
        tooltip: headers.compensationStatus,
      },
      cell: (info) => (
        <Popover>
          <PopoverTrigger>
            <RollingBadge
              className="max-w-24"
              tone="solid"
              variant={
                (
                  {
                    compensated: "positive",
                    "partially-compensated": "warning",
                    uncompensated: "destructive",
                    clarified: "secondary",
                  } as const
                )[info.getValue()]
              }
            >
              {
                (
                  {
                    compensated: "Paid",
                    "partially-compensated": (
                      <>
                        Pay{" "}
                        {props.services.formatService.financial.currency(
                          info.row.original.remainingCompensationAmount,
                        )}
                      </>
                    ),
                    uncompensated: "Unpaid",
                    clarified: "Clarified",
                  } as const
                )[info.getValue()]
              }
            </RollingBadge>
          </PopoverTrigger>
          <PopoverContent className="w-fit">
            <PopoverHeader>Compensation details</PopoverHeader>
            <ReportCostInfo
              report={info.row.original}
              services={props.services}
            />
          </PopoverContent>
        </Popover>
      ),
    }),
    columnHelper.accessor("deferredEarnings", {
      header: "Deferred earn",
      meta: {
        tooltip: headers.fullCompensationStatus,
      },
      cell: (info) => (
        <Popover>
          <PopoverTrigger>
            <RollingBadge
              className="max-w-24"
              tone="secondary"
              variant={
                (
                  {
                    compensated: "positive",
                    "partially-compensated": "warning",
                    uncompensated: "accent2",
                  } as const
                )[info.getValue()]
              }
            >
              {
                (
                  {
                    compensated: "Paid",
                    "partially-compensated": "Partially",
                    uncompensated: "Unpaid",
                  } as const
                )[info.getValue()]
              }
            </RollingBadge>
          </PopoverTrigger>
          <PopoverContent className="w-fit">
            <PopoverHeader>Compensation details</PopoverHeader>
            <ReportCostInfo
              report={info.row.original}
              services={props.services}
            />
          </PopoverContent>
        </Popover>
      ),
    }),
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
        columnHelper.accessor("compensatedAmount", {
          header: "Amount",
          cell: (info) =>
            props.services.formatService.financial.currency(info.getValue()),
          meta: {
            headerClassName: "bg-lime-50 border-x border-slate-800/10",
            cellClassName: "bg-lime-50/50 border-x border-slate-800/10",
            tooltip: headers.amount,
          },
        }),
        columnHelper.accessor("remainingCompensationAmount", {
          header: "To pay",
          cell: (info) =>
            props.services.formatService.financial.currency(info.getValue()),
          meta: {
            headerClassName: "bg-lime-50 border-x border-slate-800/10",
            cellClassName: "bg-lime-50/50 border-x border-slate-800/10",
            tooltip: headers.toPay,
            sortKey: "immediatePaymentDue",
          },
        }),
        columnHelper.accessor("remainingFullCompensationAmount", {
          header: "To comp.",
          cell: (info) =>
            props.services.formatService.financial.currency(info.getValue()),
          meta: {
            headerClassName: "bg-lime-50 border-x border-slate-800/10",
            cellClassName: "bg-lime-50/50 border-x border-slate-800/10",
            tooltip: headers.toCompensate,
            sortKey: "reportCostBalance",
          },
        }),
      ],
      meta: {
        headerClassName: "bg-lime-50 border-x border-slate-800/10",
        cellClassName: "bg-lime-50/50 border-x border-slate-800/10",
      },
    }),
    columnHelper.accessor("periodStart", {
      header: "Period",
      cell: (info) =>
        `${props.services.formatService.temporal.date(
          info.getValue(),
        )} - ${props.services.formatService.temporal.date(
          info.row.original.periodEnd,
        )}`,
      meta: {
        sortKey: "period",
      },
    }),
    columnHelper.accessor("description", {
      header: "Description",
      cell: (info) => (
        <TruncatedMultilineText>{info.getValue()}</TruncatedMultilineText>
      ),
      meta: {
        sortKey: "description",
      },
    }),
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
