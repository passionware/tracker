import { Badge } from "@/components/ui/badge.tsx";
import { CurrencyValueWidget } from "@/features/_common/CurrencyValueWidget.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithExchangeService } from "@/services/ExchangeService/ExchangeService.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { ArrowRight } from "lucide-react";
import { rd } from "@passionware/monads";

export interface CostToBillingWidgetProps
  extends WithServices<[WithFormatService, WithExchangeService]> {
  cost: { amount: number; currency: string }[];
  billing: { amount: number; currency: string }[];
  percentage?: number; // optional override; if not provided we compute
  targetCurrency?: string; // used for approximation when multiple currencies
  size?: "sm" | "md";
}

export function CostToBillingWidget({
  cost,
  billing,
  percentage,
  targetCurrency = "EUR",
  size = "sm",
  services,
}: CostToBillingWidgetProps) {
  // compute approximate totals in the target currency when needed
  const allCurrencies = Array.from(
    new Set([
      ...cost.map((c) => c.currency.toUpperCase()),
      ...billing.map((b) => b.currency.toUpperCase()),
    ]),
  );

  const exchangeRates = services.exchangeService.useExchangeRates(
    allCurrencies.map((from) => ({ from, to: targetCurrency })),
  );

  const approximateTotal = (
    values: { amount: number; currency: string }[],
  ): number | undefined => {
    return (
      rd.tryMap(exchangeRates, (rates) => {
        const rateMap = new Map<string, number>();
        rates.forEach((r) =>
          rateMap.set(`${r.from.toUpperCase()}->${r.to.toUpperCase()}`, r.rate),
        );
        return values.reduce((sum, v) => {
          const key = `${v.currency.toUpperCase()}->${targetCurrency}`;
          const rate =
            v.currency.toUpperCase() === targetCurrency.toUpperCase()
              ? 1
              : rateMap.get(key);
          if (rate === undefined) return sum;
          return sum + v.amount * rate;
        }, 0);
      }) || undefined
    );
  };

  const computedPct = (() => {
    if (typeof percentage === "number") return percentage;
    const costTotal = approximateTotal(cost);
    const billingTotal = approximateTotal(billing);
    if (costTotal === undefined || billingTotal === undefined) return undefined;
    if (!Number.isFinite(costTotal) || costTotal <= 0) return 0;
    return ((billingTotal - costTotal) / costTotal) * 100;
  })();

  const pct = computedPct;

  const chipClass = (() => {
    if (pct === undefined) return "bg-slate-100 text-slate-700";
    if (pct > 0) return "bg-emerald-100 text-emerald-700";
    if (pct < 0) return "bg-red-100 text-red-700";
    return "bg-slate-100 text-slate-700";
  })();

  const textSize = size === "md" ? "text-sm" : "text-xs";
  const iconSize = size === "md" ? "h-4 w-4" : "h-3 w-3";

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="secondary"
        className="bg-purple-100 text-purple-700 border-purple-200"
      >
        <CurrencyValueWidget
          values={cost}
          services={services}
          exchangeService={services.exchangeService}
          className="text-inherit"
        />
      </Badge>
      <ArrowRight className={`${iconSize} text-slate-400`} />
      <Badge
        variant="primary"
        className="bg-blue-100 text-blue-700 border-blue-200"
      >
        <CurrencyValueWidget
          values={billing}
          services={services}
          exchangeService={services.exchangeService}
          className="text-inherit"
        />
      </Badge>
      {typeof pct === "number" && Number.isFinite(pct) && (
        <span
          className={`${textSize} font-semibold px-2 py-0.5 rounded ${chipClass}`}
          title="(Billing - Cost) / Cost"
        >
          {pct.toFixed(1)}%
        </span>
      )}
    </div>
  );
}
