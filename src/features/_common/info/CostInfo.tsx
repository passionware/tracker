import { contractorReportQueryUtils } from "@/api/contractor-reports/contractor-reports.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { ClientWidget } from "@/features/_common/ClientView.tsx";
import { DeleteButtonWidget } from "@/features/_common/DeleteButtonWidget.tsx";
import { InlineContractorReportSearch } from "@/features/_common/inline-search/InlineContractorReportSearch.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { TransferView } from "@/features/_common/TransferView.tsx";
import { cn } from "@/lib/utils.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  CostEntry,
  WithReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import {
  ClientSpec,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { maybe, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { chain } from "lodash";
import { Check, Link2, Loader2 } from "lucide-react";

export interface CostInfoProps
  extends WithServices<
    [
      WithFormatService,
      WithReportDisplayService,
      WithPreferenceService,
      WithMutationService,
      WithClientService,
    ]
  > {
  costEntry: CostEntry;
  clientId: ClientSpec;
  workspaceId: WorkspaceSpec;
}

export function CostInfo({ costEntry, services, clientId }: CostInfoProps) {
  const linkingState = promiseState.useRemoteData();

  return (
    <div className="flex flex-col gap-4">
      <TransferView
        services={services}
        fromAmount={costEntry.remainingAmount}
        toAmount={costEntry.matchedAmount}
      />
      {costEntry.remainingAmount.amount > 0 && (
        <div className="flex gap-2 flex-row self-end">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="default" size="xs">
                {rd
                  .fullJourney(linkingState.state)
                  .initially(<Link2 />)
                  .wait(<Loader2 />)
                  .catch(renderSmallError("w-6 h-4"))
                  .map(() => (
                    <Check />
                  ))}
                Find & link report
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-fit flex flex-col max-h-[calc(-1rem+var(--radix-popover-content-available-height))]">
              <PopoverHeader>
                Match the cost with a contractor report
              </PopoverHeader>
              <InlineContractorReportSearch
                className="overflow-y-auto h-full"
                showTargetValue
                showDescription
                services={services}
                maxSourceAmount={costEntry.remainingAmount}
                onSelect={(report) =>
                  linkingState.track(
                    services.mutationService.linkCostAndReport({
                      type: "link",
                      costId: costEntry.id,
                      reportId: report.contractorReportId,
                      reportAmount: report.value.target,
                      costAmount: report.value.source, // todo: secondary input optionally
                      description: report.value.description,
                    }),
                  )
                }
                query={chain(
                  contractorReportQueryUtils.ofDefault(
                    costEntry.workspace.id, // we want to search in the same workspace only!
                    clientId,
                  ),
                )
                  .thru((x) =>
                    costEntry.contractor
                      ? // if the cost is already assigned to a contractor, just allow to search his reports
                        contractorReportQueryUtils.setFilter(
                          x,
                          "contractorId",
                          {
                            operator: "oneOf",
                            value: [costEntry.contractor.id],
                          },
                        )
                      : x,
                  )
                  .value()}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      <Separator className="my-2" />
      <div className="text-sm text-gray-700 font-medium my-1 text-center">
        Linked Contractor Reports
      </div>
      <Separator className="my-2" />

      <ul role="list" className="divide-y divide-gray-100">
        {costEntry.linkReports.map((link) => (
          <li
            key={link.id}
            className="flex items-center justify-between gap-x-6 py-5"
          >
            <div className="min-w-0">
              <div className="flex items-start gap-x-3">
                <p className="text-sm/6 font-semibold text-gray-900">Report</p>
                <Badge variant="positive" className={cn()}>
                  {services.formatService.temporal.date(
                    link.contractorReport.periodStart,
                  )}{" "}
                  -{" "}
                  {services.formatService.temporal.date(
                    link.contractorReport.periodEnd,
                  )}
                </Badge>
              </div>
              <div className="mt-1 flex items-center gap-x-2 text-xs/5 text-gray-500">
                <div className="contents text-green-800 font-bold">
                  Cost's{" "}
                  {services.formatService.financial.currency(link.costAmount)}
                </div>
                <svg viewBox="0 0 2 2" className="size-0.5 fill-current">
                  <circle r={1} cx={1} cy={1} />
                </svg>
                satisfies{" "}
                {services.formatService.financial.currency(link.reportAmount)}{" "}
                of{" "}
                <ClientWidget
                  services={services}
                  size="sm"
                  layout="avatar"
                  clientId={link.contractorReport.clientId}
                />
                's report{" "}
                {services.formatService.financial.amount(
                  link.contractorReport.netValue,
                  link.contractorReport.currency,
                )}
              </div>
            </div>
            <div className="flex flex-none items-center gap-x-4">
              <div className="text-xs text-slate-600">
                {link.contractorReport.contractor?.fullName}
              </div>
              <div className="text-gray-600 text-xs mr-1.5 max-w-64 border border-gray-300 rounded p-1 bg-gray-50 block min-w-24 whitespace-pre-line">
                <SimpleTooltip title={link.description}>
                  <div className="line-clamp-3 overflow-hidden text-ellipsis break-all text-[8pt] leading-3 text-slate-800">
                    {maybe.getOrElse(
                      maybe.fromTruthy(link.description),
                      <div className="text-slate-400">No description</div>,
                    )}
                  </div>
                </SimpleTooltip>
              </div>
              <DeleteButtonWidget
                services={services}
                onDelete={() =>
                  services.mutationService.deleteCostReportLink(link.id)
                }
              />
            </div>
          </li>
        ))}
        {costEntry.linkReports.length === 0 && (
          <div className="text-gray-500 text-center flex flex-row gap-2 items-center">
            No linked contractor reports.
          </div>
        )}
      </ul>
    </div>
  );
}
