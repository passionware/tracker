import { Billing } from "@/api/billing/billing.api.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget.tsx";
import { CommitStatusBadge } from "@/features/_common/elements/CommitStatusBadge.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { maybe, rd } from "@passionware/monads";

export interface BillingPreviewProps extends WithFrontServices {
  billingId: Billing["id"];
}

export function BillingPreview({ services, billingId }: BillingPreviewProps) {
  const billing = services.billingService.useBilling(maybe.of(billingId));

  return rd
    .journey(billing)
    .wait(
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>,
    )
    .catch(renderError)
    .map((billing) => {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">
              Billing #{billing.id}
            </span>
            <CommitStatusBadge
              id={billing.id}
              isCommitted={billing.isCommitted}
              entityType="billing"
              services={services}
            />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Net Amount:</span>
              <span className="font-medium">
                <CurrencyValueWidget
                  values={[
                    {
                      amount: billing.totalNet,
                      currency: billing.currency,
                    },
                  ]}
                  services={services}
                  exchangeService={services.exchangeService}
                />
              </span>
            </div>

            {billing.totalGross !== billing.totalNet && (
              <div className="flex justify-between">
                <span className="text-slate-500">Gross Amount:</span>
                <span className="font-medium">
                  <CurrencyValueWidget
                    values={[
                      {
                        amount: billing.totalGross,
                        currency: billing.currency,
                      },
                    ]}
                    services={services}
                    exchangeService={services.exchangeService}
                  />
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-slate-500">Invoice:</span>
              <span className="font-medium text-xs">
                {billing.invoiceNumber}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Invoice Date:</span>
              <span className="font-medium text-xs">
                {services.formatService.temporal.date(billing.invoiceDate)}
              </span>
            </div>

            {billing.description && (
              <div className="pt-2 border-t border-slate-200">
                <div className="text-xs text-slate-500">
                  <div className="font-medium mb-1">Description:</div>
                  <div className="text-slate-600 whitespace-pre-wrap">
                    {billing.description}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    });
}
