import { PopoverHeader } from "@/components/ui/popover.tsx";
import { SimpleTooltip } from "@/components/ui/tooltip.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import {
  CurrencyService,
  CurrencyValue,
} from "@/services/ExchangeService/ExchangeService.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";

export interface CurrencyValueWidgetProps
  extends WithServices<[WithFormatService]> {
  currencyService: CurrencyService;
  values: CurrencyValue[];
  targetCurrency?: string;
  showApproximation?: boolean;
  className?: string;
}

export function CurrencyValueWidget({
  values,
  targetCurrency = "EUR",
  showApproximation = true,
  services,
  currencyService,
  className,
}: CurrencyValueWidgetProps) {
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

    // Show original value with tooltip showing converted value
    const convertedValue = currencyService.convertCurrencyValue(
      value,
      targetCurrency,
    );

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
              {services.formatService.financial.currency(convertedValue)}
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

  // Multiple currencies - show approximation
  if (!showApproximation) {
    return <span className={className}>{values.length} currencies</span>;
  }

  // Calculate approximate total in target currency
  let approximateTotal = 0;
  let hasAllRates = true;

  for (const value of values) {
    try {
      const converted = currencyService.convertCurrencyValue(
        value,
        targetCurrency,
      );
      approximateTotal += converted.amount;
    } catch {
      hasAllRates = false;
      break;
    }
  }

  const approximateValue: CurrencyValue = {
    amount: approximateTotal,
    currency: targetCurrency,
  };

  if (!hasAllRates) {
    return <span className={className}>{values.length} currencies</span>;
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
