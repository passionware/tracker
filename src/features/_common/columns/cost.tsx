import { Cost } from "@/api/cost/cost.api.ts";
import { RollingBadge } from "@/components/ui/badge.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { getColumnHelper } from "@/features/_common/columns/_common/columnHelper.ts";
import { CostInfo } from "@/features/_common/info/CostInfo.tsx";
import { MergeServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
import {
  CostEntry,
  WithReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { ClientSpec } from "@/services/front/RoutingService/RoutingService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe } from "@passionware/monads";
import { startCase } from "lodash";

export const costColumns = {
  invoiceNumber: getColumnHelper<Pick<Cost, "invoiceNumber">>().accessor(
    "invoiceNumber",
    {
      header: "Invoice Number",
      cell: (info) => info.getValue() || "N/A",
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
    getColumnHelper<Pick<CostEntry, "netAmount">>().accessor("netAmount", {
      header: "Net Value",
      cell: (info) =>
        services.formatService.financial.currency(info.getValue()),
      meta: {
        sortKey: "netValue",
      },
    }),
  grossAmount: (services: WithFormatService) =>
    getColumnHelper<Pick<CostEntry, "grossAmount">>().accessor("grossAmount", {
      header: "Gross Value",
      cell: (info) =>
        maybe.mapOrElse(
          info.getValue(),
          services.formatService.financial.currency,
          "N/A",
        ),
      meta: {
        sortKey: "grossValue",
      },
    }),
  report: {
    linkStatus: {
      allowModify: (
        services: MergeServices<
          [
            WithFormatService,
            WithReportDisplayService,
            WithPreferenceService,
            WithMutationService,
            WithClientService,
            WithContractorService,
            WithWorkspaceService,
            WithExpressionService,
          ]
        >,
        clientId: ClientSpec,
        workspaceId: ClientSpec,
      ) =>
        getColumnHelper<CostEntry>().accessor("status", {
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
                  services={services}
                  clientId={clientId}
                  workspaceId={workspaceId}
                />
              </PopoverContent>
            </Popover>
          ),
        }),
    },
  },
};
