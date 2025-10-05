import { PopoverHeader } from "@/components/ui/popover.tsx";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import {
  CurrencyValue,
  ExchangeService,
} from "@/services/ExchangeService/ExchangeService.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { rd } from "@passionware/monads";

export interface CurrencyValueWidgetProps
  extends WithServices<[WithFormatService]> {
  exchangeService: ExchangeService;
  values: CurrencyValue[];
  targetCurrency?: string;
  showApproximation?: boolean;
  showSumInOriginalCurrencies?: boolean;
  className?: string;
}

export function CurrencyValueWidget({
  values,
  targetCurrency = "EUR",
  showApproximation = true,
  showSumInOriginalCurrencies = true,
  services,
  exchangeService,
  className,
}: CurrencyValueWidgetProps) {
  // Helper function to get unique currencies from values
  const getUniqueCurrencies = (values: CurrencyValue[]): string[] => {
    return Array.from(new Set(values.map((value) => value.currency)));
  };

  // Always call hooks at the top level to avoid conditional hook calls
  // Use safe defaults to ensure hooks are always called with valid parameters
  const safeValues =
    values.length > 0 ? values : [{ amount: 0, currency: "USD" }];

  const exchangeRates = exchangeService.useExchangeRates(
    safeValues.map((value) => ({
      from: value.currency,
      to: targetCurrency,
    })),
  );

  // For single currency conversion (always call hook, but with conditional values)
  const singleCurrencyConversion = exchangeService.useExchange(
    safeValues.length === 1 ? safeValues[0].currency : "USD",
    targetCurrency,
    safeValues.length === 1 ? safeValues[0].amount : 0,
  );

  const approximateTotal =
    rd.tryMap(exchangeRates, (rates) => {
      return safeValues.reduce((total, value, index) => {
        const rate = rates[index];
        return total + value.amount * rate.rate;
      }, 0);
    }) || 0;

  // Pre-calculate conversions for all unique currencies to avoid conditional hooks
  const uniqueCurrencies = getUniqueCurrencies(safeValues);
  const currencyConversionRates = exchangeService.useExchangeRates(
    uniqueCurrencies.map((currency) => ({
      from: targetCurrency,
      to: currency,
    })),
  );

  // Now we can safely handle the empty case after all hooks are called
  if (values.length === 0) {
    return <span className={className}>No budget data</span>;
  }

  if (values.length === 1) {
    const value = values[0];
    const isTargetCurrency =
      value.currency.toUpperCase() === targetCurrency.toUpperCase();

    if (!showApproximation || isTargetCurrency) {
      return (
        <span className={className}>
          {services.formatService.financial.currency(value)}
        </span>
      );
    }

    // For single currency conversion, use the pre-calculated hook result
    return (
      <SimpleTooltip
        light
        title={
          <div className="space-y-2">
            <PopoverHeader>
              Equivalent in{" "}
              {services.formatService.financial.currencySymbol(targetCurrency)}
            </PopoverHeader>
            <div className="font-semibold">
              {rd.tryMap(singleCurrencyConversion, (amount: number) =>
                services.formatService.financial.currency({
                  amount,
                  currency: targetCurrency,
                }),
              ) || "Loading..."}
            </div>
          </div>
        }
      >
        <span className={className}>
          {services.formatService.financial.currency(value)}
        </span>
      </SimpleTooltip>
    );
  }

  // Handle case where we don't want approximation
  if (!showApproximation) {
    if (showSumInOriginalCurrencies) {
      return (
        <SimpleTooltip
          light
          title={
            <div className="space-y-2">
              <PopoverHeader>Currency breakdown</PopoverHeader>
              <div className="space-y-1">
                {values.map((value, index) => (
                  <div key={index} className="font-medium">
                    {services.formatService.financial.currency(value)}
                  </div>
                ))}
              </div>
              <div className="border-t pt-2">
                <div className="text-sm text-slate-600">
                  Approximate total in each currency
                </div>
                <div className="space-y-1">
                  {uniqueCurrencies.map((currency, index) => {
                    // If converting to the same currency, show the approximate total directly
                    if (
                      currency.toUpperCase() === targetCurrency.toUpperCase()
                    ) {
                      return (
                        <div key={index} className="font-medium">
                          {services.formatService.financial.currency({
                            amount: approximateTotal,
                            currency,
                          })}
                        </div>
                      );
                    }

                    // Use the exchange rates to calculate the converted amount
                    const convertedAmount = rd.tryMap(
                      currencyConversionRates,
                      (rates) => {
                        const rate = rates[index];
                        return approximateTotal * rate.rate;
                      },
                    );

                    return (
                      <div key={index} className="font-medium">
                        {convertedAmount
                          ? services.formatService.financial.currency({
                              amount: convertedAmount,
                              currency,
                            })
                          : "Loading..."}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          }
        >
          <span className={className}>{values.length} currencies</span>
        </SimpleTooltip>
      );
    }

    return <span className={className}>{values.length} currencies</span>;
  }

  const approximateValue: CurrencyValue = {
    amount: approximateTotal,
    currency: targetCurrency,
  };

  // Check if we have exchange rates for approximation
  const hasRates = rd.tryMap(exchangeRates, () => true) || false;

  if (!hasRates) {
    return <span className={className}>Loading exchange rates...</span>;
  }

  return (
    <SimpleTooltip
      light
      title={
        <div className="space-y-2">
          <PopoverHeader>Currency breakdown</PopoverHeader>
          <div className="space-y-1">
            {values.map((value, index) => (
              <div key={index} className="font-medium">
                {services.formatService.financial.currency(value)}
              </div>
            ))}
          </div>

          {showSumInOriginalCurrencies && uniqueCurrencies.length > 0 && (
            <div className="border-t pt-2">
              <div className="text-sm text-slate-600">
                Approximate total in each currency
              </div>
              <div className="space-y-1">
                {uniqueCurrencies.map((currency, index) => {
                  // If converting to the same currency, show the approximate total directly
                  if (currency.toUpperCase() === targetCurrency.toUpperCase()) {
                    return (
                      <div key={index} className="font-medium">
                        {services.formatService.financial.currency({
                          amount: approximateTotal,
                          currency,
                        })}
                      </div>
                    );
                  }

                  // Use the exchange rates to calculate the converted amount
                  const convertedAmount = rd.tryMap(
                    currencyConversionRates,
                    (rates) => {
                      const rate = rates[index];
                      return approximateTotal * rate.rate;
                    },
                  );

                  return (
                    <div key={index} className="font-medium">
                      {convertedAmount
                        ? services.formatService.financial.currency({
                            amount: convertedAmount,
                            currency,
                          })
                        : "Loading..."}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-t pt-2">
            <div className="text-sm text-slate-600">Total (approximate)</div>
            <div className="font-semibold">
              {services.formatService.financial.currency(approximateValue)}
            </div>
          </div>
        </div>
      }
    >
      <span className={className}>
        ≈ {services.formatService.financial.currency(approximateValue)}
      </span>
    </SimpleTooltip>
  );
}
