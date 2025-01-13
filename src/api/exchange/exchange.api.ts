export interface ExchangeApi {
  getExchangeRate: (
    fromCurrency: string,
    toCurrency: string,
  ) => Promise<number>;
}
