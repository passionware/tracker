import { Badge } from "@/components/ui/badge.tsx";
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
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { ClientView } from "@/features/_common/ClientView.tsx";
import { ReportCostInfo } from "@/features/_common/info/ReportCostInfo.tsx";
import { ReportInfo } from "@/features/_common/info/ReportInfo.tsx";
import { TruncatedMultilineText } from "@/features/_common/TruncatedMultilineText.tsx";
import { WorkspaceView } from "@/features/_common/WorkspaceView.tsx";
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
import { rd } from "@passionware/monads";
import { createColumnHelper } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, TriangleAlert } from "lucide-react";
import { z } from "zod";

const columnHelper = createColumnHelper<ReportViewEntry>();

export function useColumns(props: ReportsWidgetProps) {
  return [
    columnHelper.accessor("workspace", {
      header: "Issuer",

      cell: (info) => (
        <WorkspaceView layout="avatar" workspace={rd.of(info.getValue())} />
      ),
    }),
    columnHelper.accessor("contractor.fullName", {
      header: "Contractor",
      cell: (info) => (
        <>
          {info.row.original.previousReportInfo?.adjacency === "separated" && (
            <SimpleTooltip light title="Report is not adjacent to previous">
              <Button size="icon-xs" variant="ghost">
                <TriangleAlert className="text-rose-500" />
              </Button>
            </SimpleTooltip>
          )}
          {info.row.original.previousReportInfo?.adjacency === "overlaps" && (
            <SimpleTooltip light title="Report is overlapping with previous">
              <Button size="icon-xs" variant="ghost">
                <TriangleAlert className="text-rose-500" />
              </Button>
            </SimpleTooltip>
          )}
          <span className="inline">{info.getValue()}</span>
        </>
      ),
    }),
    columnHelper.accessor("client", {
      header: "Client",
      cell: (info) => (
        <ClientView layout="avatar" size="sm" client={rd.of(info.getValue())} />
      ),
    }),
    columnHelper.accessor("status", {
      header: "Charge Status",
      meta: {
        tooltip: headers.chargeStatus,
      },
      cell: (info) => (
        <Popover>
          <PopoverTrigger>
            <Badge
              variant={
                (
                  {
                    billed: "positive",
                    "partially-billed": "warning",
                    uncovered: "destructive",
                    clarified: "secondary",
                  } as const
                )[info.getValue()]
              }
            >
              {
                {
                  billed: "Billed",
                  "partially-billed": (
                    <>
                      Bill{" "}
                      {props.services.formatService.financial.currency(
                        info.row.original.remainingAmount,
                      )}
                    </>
                  ),
                  uncovered: "Uncovered",
                  clarified: "Clarified",
                }[info.getValue()]
              }
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-fit">
            <PopoverHeader>Link billings to report</PopoverHeader>
            <ReportInfo report={info.row.original} services={props.services} />
          </PopoverContent>
        </Popover>
      ),
    }),
    columnHelper.accessor("instantEarnings", {
      header: "Instant earn",
      meta: {
        tooltip: headers.compensationStatus,
      },
      cell: (info) => (
        <Popover>
          <PopoverTrigger>
            <Badge
              tone="solid"
              variant={
                (
                  {
                    compensated: "positive",
                    "partially-compensated": "warning",
                    uncompensated: "destructive",
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
                  } as const
                )[info.getValue()]
              }
            </Badge>
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
            <Badge
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
            </Badge>
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
    columnHelper.accessor("netAmount", {
      header: "Net Amount",
      cell: (info) =>
        props.services.formatService.financial.currency(info.getValue()),
      meta: {
        headerClassName: "bg-sky-50 border-x border-slate-800/10",
        cellClassName: "bg-sky-50/50 border-x border-slate-800/10",
      },
    }),
    columnHelper.group({
      header: "Charging",
      columns: [
        columnHelper.accessor("billedAmount", {
          header: "Amount",
          cell: (info) =>
            props.services.formatService.financial.currency(info.getValue()),
          meta: {
            headerClassName: "bg-rose-50 border-x border-slate-800/10",
            cellClassName: "bg-rose-50/50 border-x border-slate-800/10",
            tooltip: "[total_billing_billing_value] billedAmount",
          },
        }),
        columnHelper.accessor("remainingAmount", {
          header: "Remaining",
          cell: (info) =>
            props.services.formatService.financial.currency(info.getValue()),
          meta: {
            headerClassName: "bg-rose-50 border-x border-slate-800/10",
            cellClassName: "bg-rose-50/50 border-x border-slate-800/10",
          },
        }),
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
    }),
    columnHelper.accessor("description", {
      header: "Description",
      cell: (info) => (
        <TruncatedMultilineText>{info.getValue()}</TruncatedMultilineText>
      ),
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
            const url =
              await props.services.expressionService.ensureExpressionValue(
                {
                  clientId: props.entry.client.id,
                  contractorId: props.entry.contractor.id,
                  workspaceId: props.entry.workspace.id,
                },
                "vars.report_url",
                {
                  reportStart: props.entry.periodStart,
                  reportEnd: props.entry.periodEnd,
                },
              );
            window.open(z.string().parse(url), "_blank");
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
