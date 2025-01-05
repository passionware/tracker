export interface CurrencyValue {
  amount: number;
  currency: string;
}

export interface CurrencyService {
  useConvertedCurrencyValue: (
    value: CurrencyValue,
    targetCurrency: string,
  ) => CurrencyValue;
  convertCurrencyValue: (
    value: CurrencyValue,
    targetCurrency: string,
  ) => CurrencyValue;
}
