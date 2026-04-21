/**
 * Convert a scalar amount expressed in `fromCurrency` into `toCurrency` using the
 * same `rateMap` convention as {@link sumCurrencyValuesInTarget} (`FROM->TO` keys).
 */
export function convertAmountBetweenCurrencies(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rateMap: Map<string, number>,
): number | null {
  if (!Number.isFinite(amount)) return null;
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  if (from === to) return amount;
  const rate = rateMap.get(`${from}->${to}`);
  if (rate === undefined || !Number.isFinite(rate) || rate <= 0) return null;
  return amount * rate;
}
