import { ExchangeApi } from "@/api/exchange/exchange.api.ts";
import { parseWithDataError } from "@/platform/zod/parseWithDataError.ts";
import { z } from "zod";

const exchangeRateSchema = z.object({
  // table: z.string(), // Tabela kursów (np. "A")
  // currency: z.string(), // Waluta (np. "euro")
  // code: z.string(), // Kod waluty (np. "EUR")
  rates: z.array(
    z.object({
      // no: z.string(), // Numer tabeli kursowej
      // effectiveDate: z.string(), // Data obowiązywania kursu
      mid: z.number(), // Średni kurs wymiany
    }),
  ),
});

export function createExchangeApi(fetchImpl: typeof fetch): ExchangeApi {
  return {
    getExchangeRate: async (_fromCurrency, _toCurrency) => {
      const fromCurrency = _fromCurrency.toUpperCase();
      const toCurrency = _toCurrency.toUpperCase();
      if (fromCurrency === toCurrency) {
        return 1;
      }

      const getResponse = async (response: Response) => {
        if (response.ok) {
          const json = await response.json();
          return parseWithDataError(exchangeRateSchema, json).rates[0].mid;
        }
        throw new Error("Failed to fetch exchange rates");
      };

      try {
        // Fetch rates for fromCurrency and toCurrency
        const [fromData, toData] = await Promise.all([
          fromCurrency === "PLN"
            ? 1
            : await getResponse(
                await fetchImpl(
                  `https://api.nbp.pl/api/exchangerates/rates/a/${fromCurrency}?format=json`,
                ),
              ),
          toCurrency === "PLN"
            ? 1
            : await getResponse(
                await fetchImpl(
                  `https://api.nbp.pl/api/exchangerates/rates/a/${toCurrency}?format=json`,
                ),
              ),
        ]);

        // Calculate exchange rate
        const exchangeRate = fromData / toData;
        return exchangeRate;
      } catch (error) {
        console.error("Error fetching exchange rate:", error);
        throw new Error("Could not retrieve exchange rate");
      }
    },
  };
}
