import { Badge } from "@/components/ui/badge.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { ClientWidget } from "@/features/_common/ClientView.tsx";
import { ChargeInfo } from "@/features/_common/info/ChargeInfo.tsx";
import { TruncatedMultilineText } from "@/features/_common/TruncatedMultilineText.tsx";
import { WorkspaceView } from "@/features/_common/WorkspaceView.tsx";
import { BillingWidgetProps } from "@/features/billing/BillingWidget.types.ts";
import { ClientBillingViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { rd } from "@passionware/monads";
import { createColumnHelper } from "@tanstack/react-table";

const columnHelper = createColumnHelper<ClientBillingViewEntry>();
export function useColumns(props: BillingWidgetProps) {
  return [
    columnHelper.accessor("id", {
      header: "Id",
      cell: (info) => <div className="font-medium">{info.getValue()}</div>,
    }),
    columnHelper.accessor("workspace", {
      header: "Issuer",
      cell: (info) => (
        <WorkspaceView layout="avatar" workspace={rd.of(info.getValue())} />
      ),
    }),
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
                  } as const
                )[info.getValue()]
              }
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-fit">
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
          {info.row.original.links
            .filter((l) => l.type === "reconcile")
            .map((link) => (
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
  ];
}
