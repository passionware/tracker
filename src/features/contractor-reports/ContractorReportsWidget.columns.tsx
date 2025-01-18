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
import { ClientWidget } from "@/features/_common/ClientView.tsx";
import { ContractorReportCostInfo } from "@/features/_common/info/ContractorReportCostInfo.tsx";
import { ContractorReportInfo } from "@/features/_common/info/ContractorReportInfo.tsx";
import { TruncatedMultilineText } from "@/features/_common/TruncatedMultilineText.tsx";
import { WorkspaceView } from "@/features/_common/WorkspaceView.tsx";
import { ContractorReportsWidgetProps } from "@/features/contractor-reports/ContractorReportsWidget.types.tsx";
import { headers } from "@/features/contractor-reports/headers.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { ContractorReportViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { rd } from "@passionware/monads";
import { createColumnHelper } from "@tanstack/react-table";
import { startCase } from "lodash";
import { MoreHorizontal, Trash2 } from "lucide-react";

const columnHelper = createColumnHelper<ContractorReportViewEntry>();

export function useColumns(props: ContractorReportsWidgetProps) {
  return [
    columnHelper.accessor("workspace", {
      header: "Issuer",

      cell: (info) => (
        <WorkspaceView layout="avatar" workspace={rd.of(info.getValue())} />
      ),
    }),
    columnHelper.accessor("contractor.fullName", { header: "Contractor" }),
    columnHelper.accessor("clientId", {
      header: "Client",
      cell: (info) => (
        <ClientWidget
          layout="avatar"
          size="xs"
          clientId={info.getValue()}
          services={props.services}
        />
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
              {startCase(info.getValue())}
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-fit">
            <PopoverHeader>Report details</PopoverHeader>
            <ContractorReportInfo
              report={info.row.original}
              services={props.services}
            />
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
              tone="secondary"
              className="border border-slate-950/20"
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
                    "partially-compensated": "Partially",
                    uncompensated: "Unpaid",
                  } as const
                )[info.getValue()]
              }
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-fit">
            <PopoverHeader>Compensation details</PopoverHeader>
            <ContractorReportCostInfo
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
              tone="outline"
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
                    "partially-compensated": "Partially",
                    uncompensated: "Unpaid",
                  } as const
                )[info.getValue()]
              }
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-fit">
            <PopoverHeader>Compensation details</PopoverHeader>
            <ContractorReportCostInfo
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
  props: WithServices<[WithPreferenceService, WithMutationService]> & {
    entry: ContractorReportViewEntry;
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
