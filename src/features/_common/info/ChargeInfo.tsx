import { contractorReportQueryUtils } from "@/api/contractor-reports/contractor-reports.api.ts";
import { linkBillingReportUtils } from "@/api/link-billing-report/link-billing-report.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { DeleteButtonWidget } from "@/features/_common/DeleteButtonWidget.tsx";
import { ContractorPicker } from "@/features/_common/inline-search/ContractorPicker.tsx";
import { InlineBillingClarify } from "@/features/_common/inline-search/InlineBillingClarify.tsx";
import { InlineContractorReportSearch } from "@/features/_common/inline-search/InlineContractorReportSearch.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { TransferView } from "@/features/_common/TransferView.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ClientBillingViewEntry,
  WithReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Slot } from "@radix-ui/react-slot";
import { chain, partial } from "lodash";
import { Check, Link2, Loader2 } from "lucide-react";

export interface ChargeInfoProps
  extends WithServices<
    [
      WithFormatService,
      WithMutationService,
      WithPreferenceService,
      WithReportDisplayService,
      WithClientService,
      WithContractorService,
    ]
  > {
  billing: ClientBillingViewEntry;
}
export function ChargeInfo({ billing, services }: ChargeInfoProps) {
  const linkingState = promiseState.useRemoteData();
  const clarifyState = promiseState.useRemoteData();

  return (
    <div className="flex flex-col gap-4">
      <TransferView
        services={services}
        fromAmount={billing.remainingAmount}
        toAmount={billing.matchedAmount}
      />
      {billing.remainingAmount.amount > 0 && (
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
                Match the billing with a contractor report
              </PopoverHeader>
              <InlineContractorReportSearch
                className="overflow-y-auto h-full"
                maxSourceAmount={billing.remainingAmount}
                services={services}
                onSelect={(report) =>
                  linkingState.track(
                    services.mutationService.linkReportAndBilling({
                      type: "reconcile",
                      clientBillingId: billing.id,
                      contractorReportId: report.contractorReportId,
                      linkAmount: report.value.source,
                    }),
                  )
                }
                showDescription={false}
                showTargetValue={false}
                query={chain(
                  contractorReportQueryUtils.ofDefault(
                    billing.workspace.id, // we want only reports from the same workspace
                    billing.clientId, // we want only reports from the same client
                  ),
                )
                  .thru((x) =>
                    contractorReportQueryUtils.setFilter(x, "remainingAmount", {
                      operator: "greaterThan",
                      value: 0,
                    }),
                  )
                  .value()}
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="warning" size="xs">
                {rd
                  .fullJourney(clarifyState.state)
                  .initially(<Link2 />)
                  .wait(<Loader2 />)
                  .catch(renderSmallError("w-6 h-4"))
                  .map(() => (
                    <Check />
                  ))}
                Clarify
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-fit max-w-md"
              align="center"
              side="right"
            >
              <InlineBillingClarify
                maxAmount={billing.remainingAmount.amount}
                services={services}
                onSelect={(data) =>
                  clarifyState.track(
                    services.mutationService.linkReportAndBilling(data),
                  )
                }
                context={{ clientBillingId: billing.id }}
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
      <div className="space-y-8">
        {billing.links.map((link) => {
          switch (link.linkType) {
            case "reconcile":
              return (
                <div className="flex items-stretch gap-2" key={link.id}>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-row justify-between items-center gap-2">
                      <Badge variant="positive">Report</Badge>
                      <Badge variant="secondary" size="sm">
                        {services.formatService.temporal.date(
                          link.report.periodStart,
                        )}
                        -
                        {services.formatService.temporal.date(
                          link.report.periodEnd,
                        )}
                      </Badge>
                    </div>
                    <div className="text-sm font-medium leading-none shrink-0 w-fit flex flex-row gap-2">
                      {services.formatService.financial.currency(
                        linkBillingReportUtils.getLinkValue("billing", link),
                      )}
                      <div className="text-gray-500">of</div>
                      <Slot className="text-gray-500">
                        {services.formatService.financial.currency(
                          linkBillingReportUtils.getLinkValue("report", link),
                        )}
                      </Slot>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-slate-600">
                      <ContractorPicker
                        services={services}
                        value={link.report.contractorId}
                        onSelect={undefined}
                      />
                    </div>
                    <div className="text-gray-600 text-xs mr-1.5 max-w-64 border border-gray-300 rounded p-1 bg-gray-50">
                      {link.report.description}
                    </div>
                  </div>
                  <DeleteButtonWidget
                    services={services}
                    onDelete={partial(
                      services.mutationService.deleteBillingReportLink,
                      link.id,
                    )}
                  />
                </div>
              );
            case "clarify":
              return (
                <div className="flex items-center gap-2" key={link.id}>
                  <div className="flex flex-row justify-between items-center gap-2">
                    <Badge variant="warning">Clarification</Badge>
                  </div>
                  <div className="text-sm font-medium leading-none shrink-0 w-fit flex flex-row gap-2">
                    {services.formatService.financial.currency(
                      linkBillingReportUtils.getLinkValue("billing", link),
                    )}
                  </div>
                  <div className="self-stretch text-gray-600 text-xs mr-1.5 max-w-64 border border-gray-300 rounded p-1 bg-gray-50">
                    {link.description}
                  </div>
                  <DeleteButtonWidget
                    services={services}
                    onDelete={partial(
                      services.mutationService.deleteBillingReportLink,
                      link.id,
                    )}
                  />
                </div>
              );
          }
        })}
        {billing.links.length === 0 && (
          <div className="text-gray-500 text-center flex flex-row gap-2 items-center">
            No linked contractor reports.
          </div>
        )}
      </div>
    </div>
  );
}
