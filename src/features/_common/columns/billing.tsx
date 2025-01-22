import { Cost } from "@/api/cost/cost.api.ts";
import { RollingBadge } from "@/components/ui/badge.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { getColumnHelper } from "@/features/_common/columns/_common/columnHelper.ts";
import { foreignColumns } from "@/features/_common/columns/foreign.tsx";
import { ContractorView } from "@/features/_common/elements/pickers/ContractorView.tsx";
import { ChargeInfo } from "@/features/_common/info/ChargeInfo.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ExpressionContext,
  WithExpressionService,
} from "@/services/front/ExpressionService/ExpressionService.ts";
import {
  BillingViewEntry,
  WithReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, rd, truthy } from "@passionware/monads";

export const billingColumns = {
  invoiceNumber: getColumnHelper<Pick<Cost, "invoiceNumber">>().accessor(
    "invoiceNumber",
    {
      header: "Invoice Number",
      meta: {
        sortKey: "invoiceNumber",
      },
    },
  ),
  invoiceDate: (services: WithFormatService) =>
    getColumnHelper<Pick<Cost, "invoiceDate">>().accessor("invoiceDate", {
      header: "Invoice Date",
      cell: (info) => services.formatService.temporal.date(info.getValue()),
      meta: {
        sortKey: "invoiceDate",
      },
    }),
  netAmount: (services: WithFormatService) =>
    getColumnHelper<Pick<BillingViewEntry, "netAmount">>().accessor(
      "netAmount",
      {
        header: "Net Amount",
        cell: (info) =>
          services.formatService.financial.amount(
            info.getValue().amount,
            info.getValue().currency,
          ),
        meta: { sortKey: "totalNet" },
      },
    ),
  grossAmount: (services: WithFormatService) =>
    getColumnHelper<Pick<BillingViewEntry, "grossAmount">>().accessor(
      "grossAmount",
      {
        header: "Gross Amount",
        cell: (info) =>
          services.formatService.financial.amount(
            info.getValue().amount,
            info.getValue().currency,
          ),
        meta: { sortKey: "totalNet" },
      },
    ),
  report: {
    linkingStatus: (
      services: WithFormatService &
        WithMutationService &
        WithPreferenceService &
        WithReportDisplayService &
        WithClientService &
        WithContractorService &
        WithWorkspaceService &
        WithExpressionService,
    ) =>
      getColumnHelper<BillingViewEntry>().accessor("status", {
        header: "Status",
        cell: (info) => (
          <Popover>
            <PopoverTrigger>
              <RollingBadge
                className="max-w-24"
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
              </RollingBadge>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="start"
              className="w-fit max-h-[calc(-1rem+var(--radix-popover-content-available-height))] overflow-y-auto"
            >
              <PopoverHeader>Invoice details</PopoverHeader>
              <ChargeInfo services={services} billing={info.row.original} />
            </PopoverContent>
          </Popover>
        ),
      }),
    linkedValue: (services: WithFormatService) =>
      getColumnHelper<BillingViewEntry>().accessor("matchedAmount", {
        header: "Matched Amount",
        cell: (info) => (
          <div className="empty:hidden flex flex-row gap-1.5 items-center">
            {services.formatService.financial.amount(
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
    remainingValue: (services: WithFormatService) =>
      getColumnHelper<BillingViewEntry>().accessor("remainingAmount", {
        header: "Remaining Amount",
        cell: (info) =>
          services.formatService.financial.amount(
            info.getValue().amount,
            info.getValue().currency,
          ),
        meta: {
          sortKey: "remainingBalance",
        },
      }),
  },
  getContextual: (context: Partial<ExpressionContext>) =>
    [
      maybe.isPresent(context.workspaceId) &&
        idSpecUtils.isAll(context.workspaceId) &&
        foreignColumns.workspace,
      maybe.isPresent(context.clientId) &&
        idSpecUtils.isAll(context.clientId) &&
        foreignColumns.client,
    ].filter(truthy.isTruthy),
};
