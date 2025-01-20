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
import { ClientView } from "@/features/_common/ClientView.tsx";
import { ContractorView } from "@/features/_common/ContractorView.tsx";
import { ChargeInfo } from "@/features/_common/info/ChargeInfo.tsx";
import { TruncatedMultilineText } from "@/features/_common/TruncatedMultilineText.tsx";
import { WorkspaceView } from "@/features/_common/WorkspaceView.tsx";
import { BillingWidgetProps } from "@/features/billing/BillingWidget.types.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { BillingViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd } from "@passionware/monads";
import { createColumnHelper } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

const columnHelper = createColumnHelper<BillingViewEntry>();
export function useColumns(props: BillingWidgetProps) {
  return [
    columnHelper.accessor("workspace", {
      header: "Issuer",
      cell: (info) => (
        <WorkspaceView layout="avatar" workspace={rd.of(info.getValue())} />
      ),
      meta: {
        sortKey: "workspace",
      },
    }),
    columnHelper.accessor("client", {
      header: "Client",
      cell: (info) => (
        <ClientView layout="avatar" size="sm" client={rd.of(info.getValue())} />
      ),
      meta: {
        sortKey: "client",
      },
    }),
    columnHelper.accessor("invoiceNumber", {
      header: "Invoice Number",
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
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => (
        <Popover>
          <PopoverTrigger>
            <Badge
              tone="solid"
              variant={
                (
                  {
                    matched: "positive",
                    unmatched: "destructive",
                    "partially-matched": "warning",
                    clarified: "secondary",
                    overmatched: "accent1",
                  } as const
                )[info.getValue()]
              }
            >
              {
                (
                  {
                    matched: "Matched",
                    unmatched: "Unmatched",
                    "partially-matched": "Partially Matched",
                    clarified: "Clarified",
                    overmatched: "Overmatched",
                  } as const
                )[info.getValue()]
              }
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-fit max-h-[calc(-1rem+var(--radix-popover-content-available-height))] overflow-y-auto">
            <PopoverHeader>Invoice details</PopoverHeader>
            <ChargeInfo services={props.services} billing={info.row.original} />
          </PopoverContent>
        </Popover>
      ),
    }),
    columnHelper.accessor("netAmount", {
      header: "Net Amount",
      cell: (info) =>
        props.services.formatService.financial.amount(
          info.getValue().amount,
          info.getValue().currency,
        ),
      meta: { sortKey: "totalNet" },
    }),
    columnHelper.accessor("grossAmount", {
      header: "Gross Amount",
      cell: (info) =>
        props.services.formatService.financial.amount(
          info.getValue().amount,
          info.getValue().currency,
        ),
      meta: {
        sortKey: "totalGross",
      },
    }),
    columnHelper.accessor("matchedAmount", {
      header: "Matched Amount",
      cell: (info) => (
        <div className="empty:hidden flex flex-row gap-1.5 items-center">
          {props.services.formatService.financial.amount(
            info.getValue().amount,
            info.getValue().currency,
          )}
          {info.row.original.contractors.map((contractor) => (
            <ContractorView
              size="sm"
              layout="avatar"
              key={contractor.id}
              contractor={rd.of(contractor)}
            />
          ))}
        </div>
      ),
      meta: {
        sortKey: "billingReportValue",
      },
    }),
    columnHelper.accessor("remainingAmount", {
      header: "Remaining Amount",
      cell: (info) =>
        props.services.formatService.financial.amount(
          info.getValue().amount,
          info.getValue().currency,
        ),
      meta: {
        sortKey: "remainingBalance",
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
