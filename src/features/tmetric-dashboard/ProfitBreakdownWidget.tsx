import { PopoverHeader } from "@/components/ui/popover";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { WithFrontServices } from "@/core/frontServices";
import type { CurrencyValue } from "@/services/ExchangeService/ExchangeService";

export interface ProfitBreakdownWidgetProps {
  services: WithFrontServices["services"];
  /** Cost values in their original currencies (for tooltip) */
  cost: CurrencyValue[];
  /** Billing values in their original currencies (for tooltip) */
  billing: CurrencyValue[];
  /** Profit already computed in target currency (e.g. from exchange conversion) */
  profitInTarget: number;
  targetCurrency: string;
  className?: string;
}

/**
 * Renders profit with a tooltip showing billing and cost in their original
 * currencies. Shows "≈" only when any cost or billing is in a different
 * currency than the displayed (target) currency (i.e. conversion was used).
 */
export function ProfitBreakdownWidget({
  services,
  cost,
  billing,
  profitInTarget,
  targetCurrency,
  className,
}: ProfitBreakdownWidgetProps) {
  const target = targetCurrency.toUpperCase();
  const hasDifferentCurrencies =
    cost.some((c) => c.currency.toUpperCase() !== target) ||
    billing.some((b) => b.currency.toUpperCase() !== target);

  const tooltipContent = (
    <div className="space-y-2">
      <PopoverHeader>Profit breakdown</PopoverHeader>
      {billing.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground">Billing</div>
          <div className="space-y-0.5">
            {billing.map((v, i) => (
              <div key={i} className="font-medium">
                {services.formatService.financial.currency(v)}
              </div>
            ))}
          </div>
        </div>
      )}
      {cost.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground">Cost</div>
          <div className="space-y-0.5">
            {cost.map((v, i) => (
              <div key={i} className="font-medium">
                {services.formatService.financial.currency(v)}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="border-t pt-2">
        <div className="text-xs text-muted-foreground">Profit (approximate)</div>
        <div className="font-semibold">
          {services.formatService.financial.currency({
            amount: profitInTarget,
            currency: targetCurrency,
          })}
        </div>
      </div>
    </div>
  );

  const displayValue = (
    <span className={className}>
      {hasDifferentCurrencies ? "≈ " : ""}
      {services.formatService.financial.currency({
        amount: profitInTarget,
        currency: targetCurrency,
      })}
    </span>
  );

  return (
    <SimpleTooltip light title={tooltipContent}>
      {displayValue}
    </SimpleTooltip>
  );
}
