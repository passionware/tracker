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
import { foreignColumns } from "@/features/_common/columns/foreign.tsx";
import { ClientWidget } from "@/features/_common/elements/pickers/ClientView.tsx";
import { CostInfo } from "@/features/_common/info/CostInfo.tsx";
import { TruncatedMultilineText } from "@/features/_common/TruncatedMultilineText.tsx";
import { PotentialCostWidgetProps } from "@/features/costs/CostWidget.types.tsx";
import { assert } from "@/platform/lang/assert";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { CostEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe } from "@passionware/monads";
import { createColumnHelper } from "@tanstack/react-table";
import { startCase } from "lodash";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

const columnHelper = createColumnHelper<CostEntry>();

export function useColumns(props: PotentialCostWidgetProps) {
  return [
    ...foreignColumns.getContextual({
      workspaceId: props.workspaceId,
      contractorId: idSpecUtils.ofAll(),
    }),
    columnHelper.accessor("invoiceNumber", {
      header: "Invoice Number",
      cell: (info) => info.getValue() || "N/A",
      meta: {
        sortKey: "invoiceNumber",
      },
    }),
    columnHelper.accessor("invoiceDate", {
      header: "Invoice Date",
      cell: (info) =>
        props.services.formatService.temporal.date(info.getValue()),
      meta: {
        sortKey: "invoiceDate",
      },
    }),
    columnHelper.accessor("netAmount", {
      header: "Net Value",
      cell: (info) =>
        props.services.formatService.financial.currency(info.getValue()),
      meta: {
        sortKey: "netValue",
      },
    }),
    columnHelper.accessor("grossAmount", {
      header: "Gross Value",
      cell: (info) =>
        maybe.mapOrElse(
          info.getValue(),
          props.services.formatService.financial.currency,
          "N/A",
        ),
      meta: {
        sortKey: "grossValue",
      },
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => (
        <Popover>
          <PopoverTrigger>
            <RollingBadge
              className="max-w-24"
              variant={
                (
                  {
                    matched: "positive",
                    unmatched: "destructive",
                    "partially-matched": "warning",
                    overmatched: "warning",
                  } as const
                )[info.getValue()]
              }
            >
              {startCase(info.getValue())}
            </RollingBadge>
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
          {info.row.original.linkReports.map((link) => {
            assert(link.report, "link.report is not null work on types");
            return (
              <ClientWidget
                layout="avatar"
                size="xs"
                key={link.link.id}
                clientId={link.report.clientId}
                services={props.services}
              />
            );
          })}
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
      meta: {
        sortKey: "description",
      },
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
  props: WithServices<
    [
      WithPreferenceService,
      WithMutationService,
      WithContractorService,
      WithWorkspaceService,
      WithMessageService,
    ]
  > & {
    entry: CostEntry;
  },
) {
  const isDangerMode = props.services.preferenceService.useIsDangerMode();
  return (
    <>
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
            <>
              <DropdownMenuItem
                onClick={() => {
                  void props.services.mutationService.deleteCost(
                    props.entry.id,
                  );
                }}
              >
                <Trash2 />
                Delete Cost
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem
            onClick={async () => {
              const result =
                await props.services.messageService.editCost.sendRequest({
                  defaultValues: props.entry.originalCost,
                });
              switch (result.action) {
                case "confirm":
                  await props.services.mutationService.editCost(
                    props.entry.id,
                    result.changes,
                  );
                  break;
                case "cancel":
                  break;
              }
            }}
          >
            <Pencil />
            Edit Cost
          </DropdownMenuItem>
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
    </>
  );
}
