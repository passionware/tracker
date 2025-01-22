import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { ClientView } from "@/features/_common/elements/pickers/ClientView.tsx";
import { WorkspaceView } from "@/features/_common/elements/pickers/WorkspaceView.tsx";
import { ReportInfo } from "@/features/_common/info/ReportInfo.tsx";
import { headers } from "@/features/reports/headers.tsx";
import { MergeServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
import {
  ReportViewEntry,
  WithReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { rd } from "@passionware/monads";
import { CellContext, createColumnHelper } from "@tanstack/react-table";
import { TriangleAlert } from "lucide-react";
import { ReactElement, ReactNode } from "react";

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
  workspace: baseColumnHelper.accessor("workspace", {
    header: "Issuer",

    cell: (info) => (
      <WorkspaceView layout="avatar" workspace={rd.of(info.getValue())} />
    ),
    meta: {
      sortKey: "workspace",
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
    regular: baseColumnHelper.accessor("contractor.fullName", {
      header: "Contractor",
      cell: (info) => info.getValue(),
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
                <Badge
                  className="max-w-24 overflow-hidden"
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
                </Badge>
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
            <Badge
              className="max-w-24 overflow-hidden"
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
            </Badge>
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
  client: baseColumnHelper.accessor("client", {
    header: "Client",
    cell: (info) => (
      <ClientView layout="avatar" size="sm" client={rd.of(info.getValue())} />
    ),
    meta: {
      sortKey: "client",
    },
  }),
  select: (
    renderer: (
      cellContext: CellContext<ReportSearchBaseModel, unknown>,
      button: ReactElement,
    ) => ReactNode,
  ) =>
    baseColumnHelper.display({
      id: "select",
      cell: (info) => renderer(info, <Button>Select</Button>),
    }),
};
