import { Cost } from "@/api/cost/cost.api.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithFrontServices } from "@/core/frontServices.ts";
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget.tsx";
import { ContractorWidget } from "@/features/_common/elements/pickers/ContractorView.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { maybe, rd } from "@passionware/monads";

export interface CostPreviewProps extends WithFrontServices {
  costId: Cost["id"];
}

export function CostPreview({ services, costId }: CostPreviewProps) {
  const cost = services.costService.useCost(maybe.of(costId));

  return rd
    .journey(cost)
    .wait(
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>,
    )
    .catch(renderError)
    .map((cost) => (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {cost.contractor && (
            <ContractorWidget
              contractorId={maybe.of(cost.contractor.id)}
              services={services}
              layout="avatar"
              size="sm"
            />
          )}
          {!cost.contractor && cost.counterparty && (
            <div className="text-sm text-slate-600">{cost.counterparty}</div>
          )}
          <span className="text-sm font-medium text-slate-700">
            Cost #{cost.id}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Net Value:</span>
            <span className="font-medium">
              <CurrencyValueWidget
                values={[
                  {
                    amount: cost.netValue,
                    currency: cost.currency,
                  },
                ]}
                services={services}
                exchangeService={services.exchangeService}
              />
            </span>
          </div>

          {cost.grossValue !== null && cost.grossValue !== undefined && (
            <div className="flex justify-between">
              <span className="text-slate-500">Gross Value:</span>
              <span className="font-medium">
                <CurrencyValueWidget
                  values={[
                    {
                      amount: cost.grossValue,
                      currency: cost.currency,
                    },
                  ]}
                  services={services}
                  exchangeService={services.exchangeService}
                />
              </span>
            </div>
          )}

          {cost.invoiceNumber && (
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice:</span>
              <span className="font-medium text-xs">{cost.invoiceNumber}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-slate-500">Invoice Date:</span>
            <span className="font-medium text-xs">
              {services.formatService.temporal.date(cost.invoiceDate)}
            </span>
          </div>

          {cost.description && (
            <div className="pt-2 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                <div className="font-medium mb-1">Description:</div>
                <div className="text-slate-600 whitespace-pre-wrap">
                  {cost.description}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    ));
}
