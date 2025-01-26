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
import { DeleteButtonWidget } from "@/features/_common/DeleteButtonWidget.tsx";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView.tsx";
import { LinkPopover } from "@/features/_common/filters/LinkPopover.tsx";
import { InlineReportSearch } from "@/features/_common/elements/inline-search/InlineReportSearch.tsx";
import { InfoLayout } from "@/features/_common/info/_common/InfoLayout.tsx";
import { InlineBillingClarify } from "@/features/_common/inline-search/InlineBillingClarify.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { TransferView } from "@/features/_common/TransferView.tsx";
import { cn } from "@/lib/utils.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
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
import { ReactElement } from "react";

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
    <InfoLayout
      header={
        <>
          Link billing to reports
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
                    Find & link report
                  </Button>
                </PopoverTrigger>
                {/* TODO candidate for inline search popover layout?*/}
                <PopoverContent
                  className={cn(
                    "w-fit flex flex-col max-h-[calc(-1rem+var(--radix-popover-content-available-height))]",
                    "min-w-[calc(min(100vw-2rem,50rem))] min-h-[30rem] bg-opacity-50 backdrop-blur-xl",
                  )}
                  side="bottom"
                  align="start"
                >
                  <PopoverHeader>
                    Match the billing with a contractor report
                  </PopoverHeader>
                  <InlineReportSearch
                    showBillingColumns
                    showCostColumns={false}
                    context={{
                      workspaceId: billing.workspace.id,
                      clientId: billing.client.id,
                      contractorId: idSpecUtils.ofAll(),
                    }}
                    query={query}
                    services={services}
                    renderSelect={(report, button, track) => {
                      const isSameCurrency =
                        report.remainingAmount.currency ===
                        billing.remainingAmount.currency;
                      return (
                        <LinkPopover
                          context={{
                            contractorId: report.contractor.id,
                            workspaceId: report.workspace.id,
                            clientId: report.client.id,
                          }}
                          side="right"
                          align="center"
                          services={services}
                          sourceCurrency={report.remainingAmount.currency}
                          title="Link contractor report"
                          sourceLabel="Billing value"
                          targetLabel="Report value"
                          targetCurrency={report.remainingAmount.currency}
                          initialValues={{
                            // billing
                            source: isSameCurrency
                              ? // we have same currency, so probably we don't need to exchange
                                Math.min(
                                  billing.remainingAmount.amount,
                                  report.remainingAmount.amount,
                                )
                              : // this won't be same, so let's assume that cost  = remaining report but in target currency
                                billing.remainingAmount.amount,
                            target: isSameCurrency
                              ? Math.min(
                                  report.remainingAmount.amount,
                                  billing.remainingAmount.amount,
                                )
                              : report.remainingAmount.amount,
                            description: [
                              isSameCurrency
                                ? `Currency exchange, 1 ${report.remainingAmount.currency} = [...] ${billing.remainingAmount.currency}, exchange cost: [...]`
                                : null,
                            ]
                              .filter(Boolean)
                              .join("\n"),
                          }}
                          onValueChange={(value) =>
                            track(
                              services.mutationService.linkReportAndBilling({
                                linkType: "reconcile",
                                billingId: billing.id,
                                billingAmount: value.source,
                                reportId: report.id,
                                reportAmount: value.target,
                                description: value.description,
                              }),
                            )
                          }
                        >
                          {button}
                        </LinkPopover>
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
        </>
      }
    >
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
                      {services.formatService.temporal.range.compact(
                        link.report.periodStart,
                        link.report.periodEnd,
                      )}
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
    </InfoLayout>
  );
}

export type ChargeInfoPopoverProps = ChargeInfoProps & {
  children: ReactElement;
};

export function ChargeInfoPopover({
  children,
  ...props
}: ChargeInfoPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-fit" side="right" align="center">
        <ChargeInfo {...props} />
      </PopoverContent>
    </Popover>
  );
}
