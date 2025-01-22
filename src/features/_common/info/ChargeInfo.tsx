import { reportQueryUtils } from "@/api/reports/reports.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { ContractorWidget } from "@/features/_common/pickers/ContractorView.tsx";
import { DeleteButtonWidget } from "@/features/_common/DeleteButtonWidget.tsx";
import { LinkPopover } from "@/features/_common/filters/LinkPopover.tsx";
import { InlineBillingClarify } from "@/features/_common/inline-search/InlineBillingClarify.tsx";
import { InlineReportSearchWidget } from "@/features/_common/inline-search/report/InlineReportSearchWidget.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { TransferView } from "@/features/_common/TransferView.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
import {
  BillingViewEntry,
  WithReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { mapKeys } from "@passionware/platform-ts";
import { Slot } from "@radix-ui/react-slot";
import { addDays, startOfDay } from "date-fns";
import { chain, partial, sortBy } from "lodash";
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
      WithWorkspaceService,
      WithExpressionService,
    ]
  > {
  billing: BillingViewEntry;
}
export function ChargeInfo({ billing, services }: ChargeInfoProps) {
  const linkingState = promiseState.useRemoteData();
  const clarifyState = promiseState.useRemoteData();

  const query = chain(
    reportQueryUtils.ofDefault(
      billing.workspace.id, // we want only reports from the same workspace
      billing.client.id, // we want only reports from the same client
    ),
  )
    .thru((x) =>
      reportQueryUtils.setFilter(x, "remainingAmount", {
        operator: "greaterThan",
        value: 0,
      }),
    )
    .value();

  const matchedReports = services.reportDisplayService.useReportView(
    reportQueryUtils.setFilter(query, "remainingAmount", {
      operator: "equal",
      value: 0,
    }),
  );

  const lastReportData = rd.map(matchedReports, (reports) =>
    maybe.getOrUndefined(
      sortBy(reports.entries, (report) => -report.periodEnd.getTime())[0],
    ),
  );

  const newReportStartDate = rd.map(lastReportData, (report) =>
    maybe.mapOrUndefined(report, (r) => startOfDay(addDays(r.periodEnd, 1))),
  );

  return (
    <div className="flex flex-col gap-4">
      <TransferView
        services={services}
        fromAmount={billing.remainingAmount}
        toAmount={billing.matchedAmount}
      />
      {billing.remainingAmount.amount !== 0 && (
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
              <InlineReportSearchWidget
                className="overflow-y-auto h-full"
                maxSourceAmount={billing.remainingAmount}
                services={services}
                onSelect={(report) => {
                  linkingState.track(
                    services.mutationService.linkReportAndBilling({
                      linkType: "reconcile",
                      billingId: billing.id,
                      billingAmount: report.value.source,
                      reportId: report.reportId,
                      reportAmount: report.value.target,
                      description: report.value.description,
                    }),
                  );
                }}
                initialNewReportValues={{
                  workspaceId: billing.workspace.id,
                  clientId: billing.client.id,
                  currency: billing.netAmount.currency,
                  contractorId:
                    billing.contractors[billing.contractors.length - 1]?.id,
                  netValue: billing.remainingAmount.amount,
                  periodStart: rd.getOrElse(newReportStartDate, undefined),
                  periodEnd: startOfDay(new Date()),
                }}
                showDescription={false}
                showTargetValue={false}
                query={query}
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
                context={{ billingId: billing.id }}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      <Separator className="my-2" />
      <div className="text-sm text-gray-700 font-medium my-1 text-center">
        Linked Reports
      </div>
      <Separator className="my-2" />
      <div className="space-y-8">
        {billing.links.map((link) => {
          const actualLink = link.link;
          switch (actualLink.linkType) {
            case "reconcile":
              return (
                <div className="flex items-stretch gap-2" key={actualLink.id}>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-row justify-between items-center gap-2">
                      <LinkPopover
                        context={{
                          contractorId: link.report.contractorId,
                          workspaceId: link.report.workspaceId,
                          clientId: billing.client.id,
                        }}
                        services={services}
                        sourceLabel="Billing amount"
                        targetLabel="Report amount"
                        sourceCurrency={billing.netAmount.currency}
                        targetCurrency={link.report.currency}
                        title="Update linked report"
                        initialValues={{
                          source: link.link.billingAmount ?? undefined,
                          target: link.link.reportAmount ?? undefined,
                          description: link.link.description,
                        }}
                        onValueChange={(_all, updates) =>
                          services.mutationService.updateBillingReportLink(
                            link.link.id,
                            mapKeys(updates, {
                              source: "billingAmount",
                              target: "reportAmount",
                            }),
                          )
                        }
                      >
                        <Button variant="headless" size="headless">
                          <Badge variant="positive">Report</Badge>
                        </Button>
                      </LinkPopover>
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
                      {services.formatService.financial.amount(
                        actualLink.billingAmount,
                        billing.netAmount.currency,
                      )}
                      <div className="text-gray-500">of</div>
                      <Slot className="text-gray-500">
                        {services.formatService.financial.amount(
                          actualLink.reportAmount,
                          link.report.currency,
                        )}
                      </Slot>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-slate-600">
                      <ContractorWidget
                        services={services}
                        contractorId={link.report.contractorId}
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
                      actualLink.id,
                    )}
                  />
                </div>
              );
            case "clarify":
              return (
                <div className="flex items-center gap-2" key={actualLink.id}>
                  <div className="flex flex-row justify-between items-center gap-2">
                    <Badge variant="warning">Clarification</Badge>
                  </div>
                  <div className="text-sm font-medium leading-none shrink-0 w-fit flex flex-row gap-2">
                    {services.formatService.financial.amount(
                      maybe.getOrThrow(
                        actualLink.reportAmount,
                        "Amount is missing",
                      ),
                      billing.netAmount.currency,
                    )}
                  </div>
                  <div className="self-stretch text-gray-600 text-xs mr-1.5 max-w-64 border border-gray-300 rounded p-1 bg-gray-50">
                    {actualLink.description}
                  </div>
                  <DeleteButtonWidget
                    services={services}
                    onDelete={partial(
                      services.mutationService.deleteBillingReportLink,
                      actualLink.id,
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
