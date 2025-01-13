import { RemoteData } from "@passionware/monads";

export interface ExchangeService {
  useExchange: (from: string, to: string, amount: number) => RemoteData<number>;
  ensureExchange: (from: string, to: string, amount: number) => Promise<number>;
  useExchangeRates: (
    spec: { from: string; to: string }[],
  ) => RemoteData<{ from: string; to: string; rate: number }[]>;
}

export interface WithExchangeService {
  exchangeService: ExchangeService;
}

export interface CurrencyValue {
  amount: number;
  currency: string;
}

export interface CurrencyValueGroup {
  values: CurrencyValue[];
  approximatedJointValue: CurrencyValue;
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
