import { RollingBadge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { getColumnHelper } from "@/features/_common/columns/_common/columnHelper.ts";
import { foreignColumns } from "@/features/_common/columns/foreign.tsx";
import { ReportCostInfo } from "@/features/_common/info/ReportCostInfo.tsx";
import { ReportInfo } from "@/features/_common/info/ReportInfo.tsx";
import { headers } from "@/features/reports/headers.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { MergeServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ExpressionContext,
  WithExpressionService,
} from "@/services/front/ExpressionService/ExpressionService.ts";
import {
  ReportViewEntry,
  WithReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithRoutingService } from "@/services/front/RoutingService/RoutingService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { truthy } from "@passionware/monads";
import { createColumnHelper } from "@tanstack/react-table";
import { TriangleAlert } from "lucide-react";

export type ReportSearchBaseModel = Pick<
  ReportViewEntry,
  | "id"
  | "description"
  | "contractor"
  | "workspace"
  | "client"
  | "netAmount"
  | "remainingAmount"
  | "billedAmount"
  | "status"
>;

export const columnHelper = createColumnHelper<ReportViewEntry>();
export const baseColumnHelper = createColumnHelper<ReportSearchBaseModel>();

export const reportColumns = {
  netAmount: (services: WithFormatService) =>
    baseColumnHelper.accessor("netAmount", {
      header: "Net Amount",
      cell: (info) =>
        services.formatService.financial.currency(info.getValue()),
      meta: {
        headerClassName: "bg-sky-50 border-x border-slate-800/10",
        cellClassName: "bg-sky-50/50 border-x border-slate-800/10",
        sortKey: "netValue",
      },
    }),
  contractor: {
    withAdjacency: columnHelper.accessor("contractor.fullName", {
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
      meta: {
        sortKey: "contractor",
      },
    }),
  },
  billing: {
    linkingStatus: {
      allowModify: (
        services: MergeServices<
          [
            WithFormatService,
            WithMutationService,
            WithPreferenceService,
            WithReportDisplayService,
            WithClientService,
            WithExpressionService,
            WithWorkspaceService,
            WithContractorService,
          ]
        >,
      ) =>
        columnHelper.accessor("status", {
          header: "Charge",
          meta: {
            tooltip: headers.chargeStatus,
          },
          cell: (info) => (
            <Popover>
              <PopoverTrigger>
                <RollingBadge
                  className="max-w-24"
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
                          {services.formatService.financial.currency(
                            info.row.original.remainingAmount,
                          )}
                        </>
                      ),
                      uncovered: "Uncovered",
                      clarified: "Clarified",
                    }[info.getValue()]
                  }
                </RollingBadge>
              </PopoverTrigger>
              <PopoverContent className="w-fit">
                <PopoverHeader>Link billings to report</PopoverHeader>
                <ReportInfo report={info.row.original} services={services} />
              </PopoverContent>
            </Popover>
          ),
        }),
      read: (services: MergeServices<[WithFormatService]>) =>
        baseColumnHelper.accessor("status", {
          header: "Charge",
          meta: {
            tooltip: headers.chargeStatus,
          },
          cell: (info) => (
            <RollingBadge
              className="max-w-24"
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
                      {services.formatService.financial.currency(
                        info.row.original.remainingAmount,
                      )}
                    </>
                  ),
                  uncovered: "Uncovered",
                  clarified: "Clarified",
                }[info.getValue()]
              }
            </RollingBadge>
          ),
        }),
    },
    remainingValue: (services: WithFormatService) =>
      baseColumnHelper.accessor("remainingAmount", {
        header: "Remaining",
        cell: (info) =>
          services.formatService.financial.currency(info.getValue()),
        meta: {
          headerClassName: "bg-rose-50 border-x border-slate-800/10",
          cellClassName: "bg-rose-50/50 border-x border-slate-800/10",
          sortKey: "remainingAmount",
        },
      }),
    linkedValue: (services: WithFormatService) =>
      baseColumnHelper.accessor("billedAmount", {
        header: "Amount",
        cell: (info) =>
          services.formatService.financial.currency(info.getValue()),
        meta: {
          headerClassName: "bg-rose-50 border-x border-slate-800/10",
          cellClassName: "bg-rose-50/50 border-x border-slate-800/10",
          tooltip: "[total_billing_billing_value] billedAmount",
          sortKey: "reportBillingValue",
        },
      }),
  },
  cost: {
    immediateLinkingStatus: {
      allowModify: (
        services: WithFormatService &
          WithMutationService &
          WithPreferenceService &
          WithReportDisplayService &
          WithRoutingService &
          WithClientService &
          WithExpressionService &
          WithWorkspaceService &
          WithContractorService,
      ) =>
        getColumnHelper<ReportViewEntry>().accessor("instantEarnings", {
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
                            {services.formatService.financial.currency(
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
                  services={services}
                />
              </PopoverContent>
            </Popover>
          ),
        }),
      read: (services: WithFormatService) =>
        getColumnHelper<ReportViewEntry>().accessor("instantEarnings", {
          header: "Instant earn",
          meta: {
            tooltip: headers.compensationStatus,
          },
          cell: (info) => (
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
                        {services.formatService.financial.currency(
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
          ),
        }),
    },
    linkingStatus: {
      read: getColumnHelper<ReportViewEntry>().accessor("deferredEarnings", {
        header: "Deferred earn",
        meta: {
          tooltip: headers.fullCompensationStatus,
        },
        cell: (info) => (
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
        ),
      }),
    },
    linkedValue: null,
    immediateRemainingValue: null,
    remainingValue: null,
  },
  getContextual: (context: ExpressionContext) =>
    [
      idSpecUtils.isAll(context.workspaceId) ? foreignColumns.workspace : null,
      idSpecUtils.isAll(context.clientId) ? foreignColumns.client : null,
      idSpecUtils.isAll(context.contractorId)
        ? reportColumns.contractor.withAdjacency
        : null,
    ].filter(truthy.isTruthy),
};
