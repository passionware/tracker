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
import { CostInfo } from "@/features/_common/info/CostInfo.tsx";
import { ContractorPicker } from "@/features/_common/inline-search/ContractorPicker.tsx";
import { TruncatedMultilineText } from "@/features/_common/TruncatedMultilineText.tsx";
import { WorkspaceView } from "@/features/_common/WorkspaceView.tsx";
import { CostsWidgetProps } from "@/features/costs/CostsWidget.types.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { CostEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { maybe, rd } from "@passionware/monads";
import { createColumnHelper } from "@tanstack/react-table";
import { startCase } from "lodash";
import { MoreHorizontal, Trash2 } from "lucide-react";

const columnHelper = createColumnHelper<CostEntry>();

export function useColumns(props: CostsWidgetProps) {
  return [
    columnHelper.accessor("workspace", {
      header: "Workspace",
      cell: (info) => (
        <WorkspaceView layout="avatar" workspace={rd.of(info.getValue())} />
      ),
    }),
    columnHelper.accessor("contractor", {
      header: "Contractor",
      cell: (info) => {
        const contractor = info.getValue();
        return contractor ? (
          <ContractorPicker
            value={contractor.id}
            onSelect={null}
            services={props.services}
            size="xs"
          />
        ) : (
          info.row.original.counterparty
        );
      },
    }),
    columnHelper.accessor("invoiceNumber", {
      header: "Invoice Number",
      cell: (info) => info.getValue() || "N/A",
    }),
    columnHelper.accessor("invoiceDate", {
      header: "Invoice Date",
      cell: (info) =>
        props.services.formatService.temporal.date(info.getValue()),
    }),
    columnHelper.accessor("netAmount", {
      header: "Net Value",
      cell: (info) =>
        props.services.formatService.financial.currency(info.getValue()),
    }),
    columnHelper.accessor("grossAmount", {
      header: "Gross Value",
      cell: (info) =>
        maybe.mapOrElse(
          info.getValue(),
          props.services.formatService.financial.currency,
          "N/A",
        ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => (
        <Popover>
          <PopoverTrigger>
            <Badge
              variant={
                (
                  {
                    matched: "positive",
                    unmatched: "destructive",
                    "partially-matched": "warning",
                  } as const
                )[info.getValue()]
              }
            >
              {startCase(info.getValue())}
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-fit">
            <PopoverHeader>Cost details</PopoverHeader>
            <CostInfo
              costEntry={info.row.original}
              services={props.services}
              clientId={props.clientId}
              workspaceId={props.workspaceId}
            />
          </PopoverContent>
        </Popover>
      ),
    }),
    columnHelper.accessor("matchedAmount", {
      header: "Matched",
      cell: (info) => (
        <div className="empty:hidden flex flex-row gap-1.5 items-center">
          {props.services.formatService.financial.currency(info.getValue())}
          {info.row.original.linkReports.map((link) => (
            <ClientWidget
              layout="avatar"
              size="xs"
              key={link.id}
              clientId={link.contractorReport.clientId}
              services={props.services}
            />
          ))}
        </div>
      ),
    }),
    columnHelper.accessor("remainingAmount", {
      header: "Remaining",
      cell: (info) =>
        props.services.formatService.financial.currency(info.getValue()),
    }),
    columnHelper.accessor("description", {
      header: "Description",
      cell: (info) => (
        <TruncatedMultilineText>{info.getValue()}</TruncatedMultilineText>
      ),
    }),
    columnHelper.display({
      id: "actions",
      cell: (info) => (
        <ActionMenu entry={info.row.original} services={props.services} />
      ),
    }),
  ];
}

function ActionMenu(
  props: WithServices<[WithPreferenceService, WithMutationService]> & {
    entry: CostEntry;
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
              void props.services.mutationService.deleteCost(props.entry.id);
            }}
          >
            <Trash2 />
            Delete Cost
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() =>
            navigator.clipboard.writeText(props.entry.id.toString())
          }
        >
          Copy cost ID
        </DropdownMenuItem>
        {/*<DropdownMenuSeparator />*/}
        {/*<DropdownMenuItem>View customer</DropdownMenuItem>*/}
        {/*<DropdownMenuItem>View payment details</DropdownMenuItem>*/}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}