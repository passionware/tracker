import { clientBillingQueryUtils } from "@/api/client-billing/client-billing.api.ts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
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
import { InlineBillingClarify } from "@/features/_common/inline-search/InlineBillingClarify.tsx";
import { InlineBillingSearch } from "@/features/_common/inline-search/InlineClientBillingSearch.tsx";
import { renderSmallError } from "@/features/_common/renderError.tsx";
import { TransferView } from "@/features/_common/TransferView.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import {
  ContractorReportViewEntry,
  WithReportDisplayService,
} from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { rd } from "@passionware/monads";
import { promiseState } from "@passionware/platform-react";
import { partial } from "lodash";
import { Check, Link2, Loader2 } from "lucide-react";

export interface ContractorReportInfoProps
  extends WithServices<
    [
      WithFormatService,
      WithMutationService,
      WithPreferenceService,
      WithReportDisplayService,
      WithClientService,
    ]
  > {
  report: ContractorReportViewEntry;
}

export function ContractorReportInfo({
  services,
  report,
}: ContractorReportInfoProps) {
  const linkingState = promiseState.useRemoteData();
  const clarifyState = promiseState.useRemoteData();
  return (
    <div className="flex flex-col gap-4">
      <TransferView
        fromAmount={report.remainingAmount}
        toAmount={report.reconciledAmount}
        services={services}
      />

      {report.remainingAmount.amount > 0 && (
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
            <PopoverContent className="w-fit">
              <PopoverHeader>
                Match the report with a client billing
              </PopoverHeader>
              <InlineBillingSearch
                maxAmount={report.remainingAmount.amount}
                services={services}
                onSelect={(data) =>
                  linkingState.track(
                    services.mutationService.linkReportAndBilling({
                      type: "reconcile",
                      contractorReportId: report.id,
                      clientBillingId: data.billingId,
                      linkAmount: data.value,
                    }),
                  )
                }
                query={clientBillingQueryUtils.setFilter(
                  clientBillingQueryUtils.ofDefault(
                    report.workspace.id, // we want to search for client billing in the same workspace as the report
                    report.clientId, // we want to search for client billing for the same client as the report
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
                  contractorReportId: report.id,
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      <Separator className="my-2" />
      <div className="text-sm text-gray-700 font-medium my-1 text-center">
        Linked invoices or clarifications
      </div>
      <Separator className="my-2" />
      <div className="space-y-8">
        {report.links.map((link) => (
          <div className="flex items-center gap-2" key={link.id}>
            <Badge
              variant={
                (
                  {
                    clientBilling: "positive",
                    clarification: "warning",
                  } as const
                )[link.linkType]
              }
              className=""
            >
              {
                {
                  clientBilling: "Client billing",
                  clarification: "Clarification",
                }[link.linkType]
              }
            </Badge>
            <div className="text-sm font-medium leading-none flex flex-row gap-2">
              {services.formatService.financial.amount(
                link.amount.amount,
                link.amount.currency,
              )}
              {link.linkType === "clientBilling" && (
                <div className="contents text-gray-500">
                  of
                  {services.formatService.financial.amount(
                    link.billing.totalNet,
                    link.billing.currency,
                  )}
                </div>
              )}
            </div>
            <div className="ml-auto font-medium text-sm flex flex-col items-end gap-1">
              {link.linkType === "clientBilling" && (
                <>
                  <div className="text-gray-600 text-xs mr-1.5">
                    {link.billing.invoiceNumber}
                  </div>
                  <Badge variant="secondary" size="sm">
                    {services.formatService.temporal.date(
                      link.billing.invoiceDate,
                    )}
                  </Badge>
                </>
              )}
              {link.linkType === "clarification" && (
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
                      {link.justification}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <DeleteButtonWidget
              services={services}
              onDelete={partial(
                services.mutationService.deleteBillingReportLink,
                link.id,
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
    </div>
  );
}
