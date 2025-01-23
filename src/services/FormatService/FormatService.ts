import { CurrencyValue } from "@/services/ExchangeService/ExchangeService.ts";
import { ReactNode } from "react";

export interface FormatService {
  financial: {
    amount: (
      value: number,
      currency: "EUR" | "USD" | string,
      fullPrecision?: boolean,
    ) => ReactNode;
    currency: (value: CurrencyValue) => ReactNode;
    currencySymbol: (currency: string) => string;
    amountWithoutCurrency: (
      value: number,
      fullPrecision?: boolean,
    ) => ReactNode;
  };
  temporal: {
    date: (date: Date) => string;
    time: (date: Date) => string;
    datetime: (date: Date) => string;
    relative: {
      /**
       * Returns the number of days left until the given date.
       * It is a live-updating value, so it will change every day.
       * @param date
       */
      useDaysLeft: (date: Date) => number;
    };
    single: {
      compact: (date: Date) => ReactNode;
    };
    range: {
      compact: (start: Date, end: Date) => ReactNode;
    };
  };
}

export interface WithFormatService {
  formatService: FormatService;
}
