import { Billing } from "@/api/billing/billing.api.ts";
import { LinkBillingReport } from "@/api/link-billing-report/link-billing-report.api.ts";
import { reportQueryUtils } from "@/api/reports/reports.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { sharedColumns } from "@/features/_common/columns/_common/sharedColumns.tsx";
import { reportColumns } from "@/features/_common/columns/report.tsx";
import { InlineReportSearch } from "@/features/_common/elements/inline-search/InlineReportSearch.tsx";
import { LinkPopover } from "@/features/_common/filters/LinkPopover.tsx";
import {
  InfoLayout,
  InfoPopoverContent,
} from "@/features/_common/info/_common/InfoLayout.tsx";
import { InlineBillingClarify } from "@/features/_common/inline-search/InlineBillingClarify.tsx";
import { ListView } from "@/features/_common/ListView.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { TransferView } from "@/features/_common/TransferView.tsx";
import { cn } from "@/lib/utils.ts";
import { assert } from "@/platform/lang/assert.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import {
  calendarDateToJSDate,
  dateToCalendarDate,
} from "@/platform/lang/internationalized-date";
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
import { createColumnHelper } from "@tanstack/react-table";
import { addDays, startOfDay } from "date-fns";
import { chain, sortBy } from "lodash";
import { mapKeys } from "@passionware/platform-ts";
import { Check, Link2, Loader2, Shuffle } from "lucide-react";
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

const columnHelper = createColumnHelper<Billing["linkBillingReport"][number]>();

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
      sortBy(
        reports.entries,
        (report) => -calendarDateToJSDate(report.periodEnd).getTime(),
      )[0],
    ),
  );

  const newReportStartDate = rd.map(lastReportData, (report) =>
    maybe.mapOrUndefined(report, (r) =>
      startOfDay(addDays(calendarDateToJSDate(r.periodEnd), 1)),
    ),
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
                    "min-w-[calc(min(100vw-2rem,50rem))] min-h-120 bg-white/50 backdrop-blur-xl",
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
                          showBreakdown={true}
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
                                breakdown: value.breakdown
                                  ? {
                                      quantity: value.breakdown.quantity ?? 0,
                                      unit: value.breakdown.unit ?? "",
                                      billingUnitPrice:
                                        value.breakdown.sourceUnitPrice ?? 0,
                                      reportUnitPrice:
                                        value.breakdown.targetUnitPrice ?? 0,
                                      billingCurrency:
                                        value.breakdown.sourceCurrency ?? "",
                                      reportCurrency:
                                        value.breakdown.targetCurrency ?? "",
                                    }
                                  : undefined,
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
                      periodStart: rd.tryMap(newReportStartDate, (date) =>
                        date ? dateToCalendarDate(date) : undefined,
                      ),
                      periodEnd: dateToCalendarDate(startOfDay(new Date())),
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
      <ListView
        query={query}
        onQueryChange={() => {}}
        data={rd.of(billing.links)}
        columns={[
          columnHelper.accessor((x) => x, {
            header: "Link",
            cell: (cellInfo) => {
              const link =
                cellInfo.getValue<
                  ChargeInfoProps["billing"]["links"][number]
                >();
              switch (link.link.linkType) {
                case "reconcile":
                  assert(link.report);
                  return (
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
                      showBreakdown={true}
                      initialValues={{
                        source: link.link.billingAmount ?? undefined,
                        target: link.link.reportAmount ?? undefined,
                        description: link.link.description,
                        breakdown: link.link.breakdown
                          ? {
                              quantity: link.link.breakdown.quantity,
                              unit: link.link.breakdown.unit,
                              sourceUnitPrice: link.link.breakdown.billingUnitPrice,
                              targetUnitPrice: link.link.breakdown.reportUnitPrice,
                              sourceCurrency: link.link.breakdown.billingCurrency,
                              targetCurrency: link.link.breakdown.reportCurrency,
                            }
                          : undefined,
                      }}
                      onValueChange={(value, updates) =>
                        services.mutationService.updateBillingReportLink(
                          link.link.id,
                          {
                            ...mapKeys(updates, {
                              source: "billingAmount",
                              target: "reportAmount",
                            }),
                            breakdown: value.breakdown
                              ? {
                                  quantity: value.breakdown.quantity ?? 0,
                                  unit: value.breakdown.unit ?? "",
                                  billingUnitPrice:
                                    value.breakdown.sourceUnitPrice ?? 0,
                                  reportUnitPrice:
                                    value.breakdown.targetUnitPrice ?? 0,
                                  billingCurrency:
                                    value.breakdown.sourceCurrency ?? "",
                                  reportCurrency:
                                    value.breakdown.targetCurrency ?? "",
                                }
                              : undefined,
                          },
                        )
                      }
                    >
                      <Button variant="headless" size="headless">
                        <Badge variant="positive">Report</Badge>
                      </Button>
                    </LinkPopover>
                  );
                case "clarify":
                  return <Badge variant="warning">Clarify</Badge>;
              }
            },
          }),
          {
            ...sharedColumns.contractorId(services),
            accessorKey: "report.contractorId",
          },
          { ...reportColumns.period(services), accessorFn: (x) => x.report },
          columnHelper.accessor((x) => x.link, {
            header: "Linking",
            cell: (cellInfo) => {
              const value = cellInfo.getValue<LinkBillingReport>();

              if (maybe.isAbsent(value.reportAmount)) {
                assert(
                  maybe.isPresent(value.billingAmount),
                  "Report id is missing",
                );
                return (
                  <div className="flex flex-row gap-2 items-center h-full">
                    <div>clarify</div>
                    <div>
                      {services.formatService.financial.amount(
                        value.billingAmount,
                        billing.netAmount.currency,
                      )}
                    </div>
                    <div>of billing</div>
                  </div>
                );
              }
              assert(
                maybe.isPresent(value.billingAmount),
                "Billing id is missing",
              );
              return (
                <div className="flex flex-row gap-2 items-center h-full">
                  <div>billing of</div>
                  <div className="text-green-600 font-bold">
                    {services.formatService.financial.amount(
                      value.billingAmount,
                      billing.netAmount.currency,
                    )}
                  </div>
                  <Shuffle className="size-4" />
                  <div>
                    {services.formatService.financial.amount(
                      value.reportAmount,
                      maybe.getOrThrow(cellInfo.row.original.report).currency,
                    )}
                  </div>
                  <div>of report</div>
                </div>
              );
            },
          }),
          {
            ...sharedColumns.description,
            accessorKey: "link.description",
            header: "Link description",
          },
          {
            ...sharedColumns.description,
            accessorKey: "report.description",
            header: "Report description",
          },
        ]}
      />
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
      <InfoPopoverContent align="start" side="bottom">
        <ChargeInfo {...props} />
      </InfoPopoverContent>
    </Popover>
  );
}
