import { Client } from "@/api/clients/clients.api.ts";
import { contractorReportQueryUtils } from "@/api/contractor-reports/contractor-reports.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { DeleteButtonWidget } from "@/features/_common/DeleteButtonWidget.tsx";
import { InlineBillingClarify } from "@/features/_common/inline-search/InlineBillingClarify.tsx";
import { InlineContractorReportSearch } from "@/features/_common/inline-search/InlineContractorReportSearch.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { cn } from "@/lib/utils.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ClientBillingViewEntry,
  WithReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { Slot } from "@radix-ui/react-slot";
import { partial } from "lodash";
import { Check, Link2, Loader2 } from "lucide-react";

export interface ChargeInfoProps
  extends WithServices<
    [
      WithFormatService,
      WithMutationService,
      WithPreferenceService,
      WithReportDisplayService,
    ]
  > {
  billing: ClientBillingViewEntry;
  clientId: Client["id"];
}
export function ChargeInfo({ billing, services, clientId }: ChargeInfoProps) {
  const linkingState = promiseState.useRemoteData();
  const clarifyState = promiseState.useRemoteData();

  return (
    <>
      <div className="flex justify-between">
        <div className="text-green-700 flex flex-col gap-2 items-start">
          <Badge tone="outline" variant="positive">
            Matched Total
          </Badge>
          {services.formatService.financial.amount(
            billing.matchedAmount.amount,
            billing.matchedAmount.currency,
          )}
        </div>
        <div
          className={cn(
            "flex flex-col gap-2 items-end",
            billing.remainingAmount.amount === 0
              ? "text-gray-800"
              : "text-red-800",
          )}
        >
          <Badge tone="outline" variant="destructive">
            Remaining Total
          </Badge>
          {services.formatService.financial.amount(
            billing.remainingAmount.amount,
            billing.remainingAmount.currency,
          )}
        </div>
      </div>
      <Separator className="my-2" />
      <div className="text-sm text-gray-700 font-medium my-1 text-center">
        Linked Contractor Reports
      </div>
      <Separator className="my-2" />
      <div className="space-y-8">
        {billing.links.map((link) => {
          switch (link.type) {
            case "reconcile":
              return (
                <div className="flex items-stretch gap-2" key={link.id}>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-row justify-between items-center gap-2">
                      <Badge variant="positive">Report</Badge>
                      <Badge variant="secondary" size="sm">
                        {services.formatService.temporal.date(
                          link.contractorReport.periodStart,
                        )}
                        -
                        {services.formatService.temporal.date(
                          link.contractorReport.periodEnd,
                        )}
                      </Badge>
                    </div>
                    <div className="text-sm font-medium leading-none shrink-0 w-fit flex flex-row gap-2">
                      {services.formatService.financial.amount(
                        link.amount.amount,
                        link.amount.currency,
                      )}
                      <div className="text-gray-500">of</div>
                      <Slot className="text-gray-500">
                        {services.formatService.financial.amount(
                          link.contractorReport.netValue,
                          link.contractorReport.currency,
                        )}
                      </Slot>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-slate-600">
                      {link.contractorReport.contractor?.fullName}
                    </div>
                    <div className="text-gray-600 text-xs mr-1.5 max-w-64 border border-gray-300 rounded p-1 bg-gray-50">
                      {link.contractorReport.description}
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
                    {services.formatService.financial.amount(
                      link.amount.amount,
                      link.amount.currency,
                    )}
                  </div>
                  <div className="self-stretch text-gray-600 text-xs mr-1.5 max-w-64 border border-gray-300 rounded p-1 bg-gray-50">
                    {link.justification}
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
        {billing.remainingAmount.amount > 0 && (
          <div className="flex gap-2 flex-row">
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
              <PopoverContent className="w-fit">
                <InlineContractorReportSearch
                  maxAmount={billing.remainingAmount.amount}
                  services={services}
                  onSelect={(report) =>
                    linkingState.track(
                      services.mutationService.linkReportAndBilling({
                        type: "reconcile",
                        clientBillingId: billing.id,
                        contractorReportId: report.contractorReportId,
                        linkAmount: report.value,
                      }),
                    )
                  }
                  query={contractorReportQueryUtils.setFilter(
                    contractorReportQueryUtils.setFilter(
                      contractorReportQueryUtils.ofDefault(),
                      "remainingAmount",
                      { operator: "greaterThan", value: 0 },
                    ),
                    "clientId",
                    {
                      operator: "oneOf",
                      value: [clientId],
                    },
                  )}
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
      </div>
    </>
  );
}
