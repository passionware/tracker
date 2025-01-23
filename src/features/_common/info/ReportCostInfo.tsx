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
import { LinkPopover } from "@/features/_common/filters/LinkPopover.tsx";
import { InlineBillingClarify } from "@/features/_common/inline-search/InlineBillingClarify.tsx";
import { InlineCostSearch } from "@/features/_common/inline-search/InlineCostSearch.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { TransferView } from "@/features/_common/TransferView.tsx";
import { TruncatedMultilineText } from "@/features/_common/TruncatedMultilineText.tsx";
import { assert } from "@/platform/lang/assert.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
import {
  ReportViewEntry,
  WithReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithRoutingService } from "@/services/front/RoutingService/RoutingService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { mapKeys } from "@passionware/platform-ts";
import { chain, partial } from "lodash";
import { Check, Link2, Loader2 } from "lucide-react";

export interface ReportCostInfoProps
  extends WithServices<
    [
      WithFormatService,
      WithMutationService,
      WithReportDisplayService,
      WithPreferenceService,
      WithContractorService,
      WithExpressionService,
      WithWorkspaceService,
      WithClientService,
      WithRoutingService,
    ]
  > {
  report: ReportViewEntry;
}

export function ReportCostInfo({ services, report }: ReportCostInfoProps) {
  const linkingState = promiseState.useRemoteData();
  const clarifyState = promiseState.useRemoteData();

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
                      reportId: report.id,
                      reportAmount: data.value.source,
                      costAmount: data.value.target,
                      description: data.value.description,
                    }),
                  )
                }
                query={chain(
                  costQueryUtils.ofDefault(
                    report.workspace.id,
                    report.client.id,
                  ),
                )
                  .thru((x) =>
                    costQueryUtils.setFilter(x, "linkedRemainder", {
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
                  .thru((x) =>
                    costQueryUtils.setFilter(x, "potentialClientId", {
                      operator: "oneOf",
                      value: [report.client.id, null],
                    }),
                  ) // we want to see all costs since they may be not linked to any, or effectively linked to multiple clients
                  .thru((x) => costQueryUtils.removeFilter(x, "clientId")) // we want to see all costs since they may be not linked to any, or effectively linked to multiple clients
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
                maxAmount={report.remainingCompensationAmount.amount}
                services={services}
                onSelect={(data) => {
                  assert(data.linkType === "clarify");
                  assert(
                    maybe.isPresent(data.reportAmount),
                    "Only report clarifications are allowed",
                  );
                  void clarifyState.track(
                    services.mutationService.linkCostAndReport({
                      reportId: report.id,
                      reportAmount: data.reportAmount,
                      description: data.description,
                      costId: null,
                      costAmount: 0,
                    }),
                  );
                }}
                context={{ reportId: report.id, billingId: -1 }} // stop reusing InlineBilingClarify for cost clarifications
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
        {report.costLinks.map((link) => {
          function getContent() {
            if (
              maybe.isPresent(link.link.reportId) &&
              maybe.isPresent(link.link.costId)
            ) {
              return (
                <>
                  <LinkPopover
                    context={{
                      contractorId: report.contractor.id,
                      workspaceId: report.workspace.id,
                      clientId: idSpecUtils.ofAll(),
                    }}
                    services={services}
                    sourceLabel="Report amount"
                    targetLabel="Cost amount"
                    sourceCurrency={report.netAmount.currency}
                    targetCurrency={maybe.getOrThrow(link.cost).currency}
                    title="Update linked report"
                    initialValues={{
                      source: link.link.reportAmount ?? undefined,
                      target: link.link.costAmount ?? undefined,
                      description: link.link.description,
                    }}
                    onValueChange={(_all, updates) =>
                      services.mutationService.updateCostReportLink(
                        link.link.id,
                        mapKeys(updates, {
                          source: "reportAmount",
                          target: "costAmount",
                        }),
                      )
                    }
                  >
                    <Button variant="headless" size="headless">
                      <Badge variant="positive">Cost</Badge>
                    </Button>
                  </LinkPopover>
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium leading-none flex flex-row gap-2">
                      {services.formatService.financial.amount(
                        link.link.costAmount,
                        maybe.getOrThrow(
                          link.cost?.currency,
                          "todo fix types - discriminated union?",
                        ),
                      )}
                      <div className="contents text-gray-500">
                        satisfies
                        {services.formatService.financial.amount(
                          link.link.reportAmount,
                          maybe.getOrThrow(
                            report.netAmount.currency,
                            "todo fix types - discriminated union?",
                          ),
                        )}
                      </div>
                    </div>
                    <div className="flex flex-row gap-2">
                      <span className="text-xs text-slate-600">
                        invoiced at
                      </span>
                      {services.formatService.temporal.single.compact(
                        maybe.getOrThrow(
                          link.cost,
                          "todo fix types - discriminated union?",
                        ).invoiceDate,
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 ml-auto">
                    <div className="text-xs text-slate-500">
                      Linking description
                    </div>
                    <SimpleTooltip title={link.link.description}>
                      <div className="line-clamp-3 overflow-hidden text-ellipsis break-all text-[8pt] leading-3 text-slate-800 p-2 bg-slate-100 rounded">
                        {maybe.getOrElse(
                          maybe.fromTruthy(link.link.description),
                          <div className="text-slate-400">No description</div>,
                        )}
                      </div>
                    </SimpleTooltip>
                    <div className="text-xs text-slate-500">
                      Cost description
                    </div>
                    {link.cost && (
                      <SimpleTooltip title={link.cost.description}>
                        <div className="line-clamp-3 overflow-hidden text-ellipsis break-all text-[8pt] leading-3 text-slate-800 p-2 bg-slate-100 rounded">
                          {maybe.getOrElse(
                            maybe.fromTruthy(link.cost.description),
                            <div className="text-slate-400">
                              No description
                            </div>,
                          )}
                        </div>
                      </SimpleTooltip>
                    )}
                  </div>
                </>
              );
            }
            return (
              <>
                <Badge variant="secondary" tone="secondary">
                  Clarification
                </Badge>
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-medium leading-none flex flex-row gap-2">
                    {services.formatService.financial.amount(
                      link.link.reportAmount,
                      report.netAmount.currency,
                    )}
                    <div className="contents text-gray-500">is clarified</div>
                    <TruncatedMultilineText>
                      {link.link.description}
                    </TruncatedMultilineText>
                  </div>
                </div>
              </>
            );
          }

          return (
            <div
              className="flex items-center gap-2 bg-slate-50 p-1 border border-slate-200 rounded"
              key={link.link.id}
            >
              {getContent()}
              <DeleteButtonWidget
                services={services}
                onDelete={partial(
                  services.mutationService.deleteCostReportLink,
                  link.link.id,
                )}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-sm text-gray-600">
        Ensure all costs are correctly linked to this report to maintain
        accurate financial tracking.
      </div>
    </div>
  );
}
