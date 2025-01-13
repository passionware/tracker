import { costQueryUtils } from "@/api/cost/cost.api.ts";
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
import { DeleteButtonWidget } from "@/features/_common/DeleteButtonWidget.tsx";
import { InlineCostSearch } from "@/features/_common/inline-search/InlineCostSearch.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { TransferView } from "@/features/_common/TransferView.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ContractorReportViewEntry,
  WithReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { maybe, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { chain, partial } from "lodash";
import { Check, Link2, Loader2 } from "lucide-react";

export interface ContractorReportCostInfoProps
  extends WithServices<
    [
      WithFormatService,
      WithMutationService,
      WithReportDisplayService,
      WithPreferenceService,
      WithContractorService,
    ]
  > {
  report: ContractorReportViewEntry;
}

export function ContractorReportCostInfo({
  services,
  report,
}: ContractorReportCostInfoProps) {
  const linkingState = promiseState.useRemoteData();

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <TransferView
        fromAmount={report.remainingCompensationAmount}
        toAmount={report.compensatedAmount}
        // extraAmount={report.remainingFullCompensationAmount}
        fromLabel="Remaining"
        toLabel="Paid"
        // extraLabel="Compensated"
        services={services}
      />

      {report.remainingCompensationAmount.amount > 0 && (
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
                Find & link cost
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-fit flex flex-col max-h-[calc(-1rem+var(--radix-popover-content-available-height))]">
              <PopoverHeader>Match the report with a cost entry</PopoverHeader>
              <InlineCostSearch
                className="overflow-y-auto h-full"
                showTargetValue
                showDescription
                maxSourceAmount={report.remainingFullCompensationAmount}
                services={services}
                onSelect={(data) =>
                  linkingState.track(
                    services.mutationService.linkCostAndReport({
                      costId: data.costId,
                      contractorReportId: report.id,
                      reportAmount: data.value.source,
                      costAmount: data.value.target,
                      description: data.value.description,
                    }),
                  )
                }
                query={chain(
                  costQueryUtils.ofDefault(
                    report.workspace.id,
                    report.clientId,
                  ),
                )
                  .thru((x) =>
                    costQueryUtils.setFilter(x, "remainingAmount", {
                      operator: "greaterThan",
                      value: 0,
                    }),
                  )
                  .thru((x) =>
                    costQueryUtils.setFilter(x, "contractorId", {
                      operator: "oneOf",
                      value: [report.contractor.id, null],
                    }),
                  )
                  .thru((x) => costQueryUtils.removeFilter(x, "clientId")) // we want to see all costs since they may be not linked to any, or effectively linked to multiple clients
                  .value()}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      <Separator className="my-2" />
      <div className="text-sm text-gray-700 font-medium my-1 text-center">
        Linked costs
      </div>
      <Separator className="my-2" />
      <div className="space-y-2">
        {report.costLinks.map((link) => (
          <div
            className="flex items-center gap-2 bg-slate-50 p-1 border border-slate-200 rounded"
            key={link.id}
          >
            <Badge variant="positive">Cost</Badge>
            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium leading-none flex flex-row gap-2">
                {services.formatService.financial.currency(link.costAmount)}
                <div className="contents text-gray-500">
                  satisfies
                  {services.formatService.financial.currency(link.reportAmount)}
                </div>
              </div>
              <div className="flex flex-row gap-2">
                <span className="text-xs text-slate-600">invoiced at</span>
                <Badge variant="secondary" size="sm">
                  {services.formatService.temporal.date(link.cost.invoiceDate)}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 ml-auto">
              <div className="text-xs text-slate-500">Linking description</div>
              <SimpleTooltip title={link.description}>
                <div className="line-clamp-3 overflow-hidden text-ellipsis break-all text-[8pt] leading-3 text-slate-800 p-2 bg-slate-100 rounded">
                  {maybe.getOrElse(
                    maybe.fromTruthy(link.description),
                    <div className="text-slate-400">No description</div>,
                  )}
                </div>
              </SimpleTooltip>
              <div className="text-xs text-slate-500">Cost description</div>
              <SimpleTooltip title={link.cost.description}>
                <div className="line-clamp-3 overflow-hidden text-ellipsis break-all text-[8pt] leading-3 text-slate-800 p-2 bg-slate-100 rounded">
                  {maybe.getOrElse(
                    maybe.fromTruthy(link.cost.description),
                    <div className="text-slate-400">No description</div>,
                  )}
                </div>
              </SimpleTooltip>
            </div>
            <DeleteButtonWidget
              services={services}
              onDelete={partial(
                services.mutationService.deleteCostReportLink,
                link.id,
              )}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 text-sm text-gray-600">
        Ensure all costs are correctly linked to this report to maintain
        accurate financial tracking.
      </div>
    </div>
  );
}
