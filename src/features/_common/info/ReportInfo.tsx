import { billingQueryUtils } from "@/api/billing/billing.api.ts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import CircleProgress from "@/components/ui/circle-progress.tsx";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { DeleteButtonWidget } from "@/features/_common/DeleteButtonWidget.tsx";
import { InlineBillingSearch } from "@/features/_common/elements/inline-search/InlineBillingSearch.tsx";
import { ClientWidget } from "@/features/_common/elements/pickers/ClientView.tsx";
import { LinkPopover } from "@/features/_common/filters/LinkPopover.tsx";
import {
  InfoLayout,
  InfoPopoverContent,
} from "@/features/_common/info/_common/InfoLayout.tsx";
import { InlineBillingClarify } from "@/features/_common/inline-search/InlineBillingClarify.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { TransferView } from "@/features/_common/TransferView.tsx";
import { cn } from "@/lib/utils.ts";
import { WithServices } from "@/platform/typescript/services.ts";
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
import { maybe, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { mapKeys } from "@passionware/platform-ts";
import { partial } from "lodash";
import { Check, Link2, Loader2 } from "lucide-react";
import { ReactElement } from "react";

export interface ReportInfoProps
  extends WithServices<
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
  > {
  report: ReportViewEntry;
}

export function ReportInfo({ services, report }: ReportInfoProps) {
  const linkingState = promiseState.useRemoteData();
  const clarifyState = promiseState.useRemoteData();
  return (
    <InfoLayout
      header={
        <>
          Report's linking to billing
          <TransferView
            fromAmount={report.remainingAmount}
            toAmount={report.billedAmount}
            services={services}
            fromLabel="Unlinked to billing"
            toLabel="Linked to billing"
          />
          {report.remainingAmount.amount !== 0 && (
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
                    Find & link billing
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
                    Match the report with a client billing
                  </PopoverHeader>
                  <InlineBillingSearch
                    context={{
                      clientId: report.client.id,
                      workspaceId: report.workspace.id,
                    }}
                    className="overflow-y-auto h-full"
                    services={services}
                    renderSelect={(billing, button, track) => {
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
                          targetCurrency={billing.remainingAmount.currency}
                          title="Link contractor report"
                          sourceLabel="Report value"
                          targetLabel="Billing value"
                          initialValues={{
                            // billing
                            source: isSameCurrency
                              ? // we have same currency, so probably we don't need to exchange
                                Math.min(
                                  billing.remainingAmount.amount,
                                  report.remainingAmount.amount,
                                )
                              : // this won't be same, so let's assume that cost  = remaining report but in target currency
                                report.remainingAmount.amount,
                            target: isSameCurrency
                              ? Math.min(
                                  report.remainingAmount.amount,
                                  billing.remainingAmount.amount,
                                )
                              : billing.remainingAmount.amount,
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
                                billingAmount: value.target,
                                reportId: report.id,
                                reportAmount: value.source,
                                description: value.description,
                              }),
                            )
                          }
                        >
                          {button}
                        </LinkPopover>
                      );
                    }}
                    query={billingQueryUtils.setFilter(
                      billingQueryUtils.ofDefault(
                        report.workspace.id, // we want to search for client billing in the same workspace as the report
                        report.client.id, // we want to search for client billing for the same client as the report
                      ),
                      "remainingAmount",
                      { operator: "greaterThan", value: 0 },
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
                    maxAmount={report.remainingAmount.amount}
                    services={services}
                    onSelect={(data) =>
                      clarifyState.track(
                        services.mutationService.linkReportAndBilling(data),
                      )
                    }
                    context={{
                      reportId: report.id,
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </>
      }
    >
      <div className="space-y-8">
        {report.billingLinks.map((link) => (
          <div className="flex items-center gap-2" key={link.link.id}>
            {link.link.linkType === "clarify" && (
              <Badge variant="warning" size="sm">
                Clarification
              </Badge>
            )}
            {link.link.linkType === "reconcile" &&
              link.billing &&
              link.billing.currency === report.netAmount.currency && (
                <LinkPopover
                  context={{
                    contractorId: report.contractor.id,
                    workspaceId: report.workspace.id,
                    clientId: report.client.id,
                  }}
                  services={services}
                  sourceLabel="Report amount"
                  targetLabel="Billing amount"
                  sourceCurrency={report.netAmount.currency}
                  targetCurrency={link.billing.currency}
                  title="Update linked billing"
                  initialValues={{
                    source: link.link.reportAmount,
                    target: link.link.billingAmount,
                    description: link.link.description,
                  }}
                  onValueChange={(_all, updates) =>
                    services.mutationService.updateBillingReportLink(
                      link.link.id,
                      mapKeys(updates, {
                        source: "reportAmount",
                        target: "billingAmount",
                      }),
                    )
                  }
                >
                  <Button variant="headless" size="headless">
                    {(() => {
                      if (link.link.reportAmount < link.link.billingAmount) {
                        return (
                          <Badge variant="warning" size="sm">
                            Overbilling
                          </Badge>
                        );
                      }
                      if (link.link.reportAmount > link.link.billingAmount) {
                        return (
                          <Badge variant="destructive">Underbilling</Badge>
                        );
                      }
                      return <Badge variant="positive">Billing</Badge>;
                    })()}
                  </Button>
                </LinkPopover>
              )}

            <div className="text-sm font-medium leading-none flex flex-row gap-2 items-center">
              {services.formatService.financial.amount(
                maybe.getOrThrow(
                  link.link.reportAmount,
                  "reportAmount is missing",
                ),
                report.netAmount.currency,
              )}
              /{services.formatService.financial.currency(report.netAmount)}
              <CircleProgress
                className="w-6 h-6 border rounded-full"
                value={
                  ((link.link.reportAmount ?? 0) / report.netAmount.amount) *
                  100
                }
              />
              {link.billing && (
                <div className="contents text-gray-500">
                  of work billed as
                  {services.formatService.financial.amount(
                    maybe.getOrThrow(
                      link.link.billingAmount,
                      "billingAmount is missing",
                    ),
                    link.billing.currency,
                  )}
                  to
                  <ClientWidget
                    size="xs"
                    clientId={link.billing.clientId}
                    services={services}
                  />
                  as
                </div>
              )}
            </div>
            <div className="ml-auto font-medium text-sm flex flex-col items-end gap-1">
              {link.billing && (
                <>
                  <div className="text-gray-600 text-xs mr-1.5">
                    {link.billing.invoiceNumber}
                  </div>
                  {services.formatService.temporal.single.compact(
                    link.billing.invoiceDate,
                  )}
                </>
              )}
              {link.link.linkType === "clarify" && (
                <Popover>
                  <PopoverTrigger>
                    <Badge size="sm" variant="secondary">
                      Justification
                    </Badge>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    side="right"
                    className="max-w-lg w-fit"
                  >
                    <PopoverHeader>
                      Justification for unmatched amount
                    </PopoverHeader>
                    <div className="text-xs text-gray-900">
                      {link.link.description}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <DeleteButtonWidget
              services={services}
              onDelete={partial(
                services.mutationService.deleteBillingReportLink,
                link.link.id,
              )}
            />
          </div>
        ))}
      </div>
      <Alert variant="info" className="mt-4">
        <AlertTitle>
          If remaining amount is greater than 0, it may mean:
        </AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside text-left">
            <li>We didn't link report to existing invoice</li>
            <li>We forgot to invoice the client</li>
            <li>We didn't clarify the difference, like discount</li>
          </ul>
        </AlertDescription>
      </Alert>
    </InfoLayout>
  );
}

export type ReportInfoPopoverProps = ReportInfoProps & {
  children: ReactElement;
};
export function ReportInfoPopover({
  children,
  ...props
}: ReportInfoPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <InfoPopoverContent>
        <ReportInfo {...props} />
      </InfoPopoverContent>
    </Popover>
  );
}
