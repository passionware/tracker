import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
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
import { NewBillingWidget } from "@/features/billing/NewBillingWidget.tsx";
import { useOpenState } from "@/platform/react/useOpenState.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { BillingViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
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
    }),
    columnHelper.accessor("client", {
      header: "Client",
      cell: (info) => (
        <ClientView layout="avatar" size="sm" client={rd.of(info.getValue())} />
      ),
    }),
    columnHelper.accessor("invoiceNumber", {
      header: "Invoice Number",
    }),
    columnHelper.accessor("invoiceDate", {
      header: "Invoice Date",
      cell: (info) =>
        props.services.formatService.temporal.date(info.getValue()),
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
    }),
    columnHelper.accessor("grossAmount", {
      header: "Gross Amount",
      cell: (info) =>
        props.services.formatService.financial.amount(
          info.getValue().amount,
          info.getValue().currency,
        ),
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
    }),
    columnHelper.accessor("remainingAmount", {
      header: "Remaining Amount",
      cell: (info) =>
        props.services.formatService.financial.amount(
          info.getValue().amount,
          info.getValue().currency,
        ),
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
  props: WithServices<
    [
      WithPreferenceService,
      WithMutationService,
      WithClientService,
      WithWorkspaceService,
    ]
  > & {
    entry: BillingViewEntry;
  },
) {
  const isDangerMode = props.services.preferenceService.useIsDangerMode();
  const editModalState = useOpenState();
  return (
    <>
      <Dialog {...editModalState.dialogProps}>
        <DialogContent>
          <DialogTitle>Edit billing</DialogTitle>
          <DialogDescription></DialogDescription>
          <NewBillingWidget
            onCancel={editModalState.close}
            defaultValues={{
              workspaceId: props.entry.workspace.id,
              currency: props.entry.netAmount.currency,
              totalNet: props.entry.netAmount.amount,
              totalGross: props.entry.grossAmount.amount,
              invoiceNumber: props.entry.invoiceNumber,
              invoiceDate: props.entry.invoiceDate,
              description: props.entry.description,
              clientId: props.entry.client.id,
            }}
            services={props.services}
            onSubmit={(data) =>
              props.services.mutationService
                .editBilling(props.entry.id, data)
                .then(editModalState.close)
            }
          />
        </DialogContent>
      </Dialog>
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
                void props.services.mutationService.deleteBilling(
                  props.entry.id,
                );
              }}
            >
              <Trash2 />
              Delete Billing
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={editModalState.open}>
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
    </>
  );
}
