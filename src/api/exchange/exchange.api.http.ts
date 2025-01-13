import { ExchangeApi } from "@/api/exchange/exchange.api.ts";
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
    getExchangeRate: async (fromCurrency, toCurrency) => {
      try {
        // Fetch rates for fromCurrency and toCurrency
        const [fromResponse, toResponse] = await Promise.all([
          fetchImpl(
            `https://api.nbp.pl/api/exchangerates/rates/a/${fromCurrency}?format=json`,
          ),
          fetchImpl(
            `https://api.nbp.pl/api/exchangerates/rates/a/${toCurrency}?format=json`,
          ),
        ]);

        if (!fromResponse.ok || !toResponse.ok) {
          throw new Error("Failed to fetch exchange rates");
        }

        // Parse JSON responses
        const fromData = await fromResponse.json();
        const toData = await toResponse.json();

        // Validate responses using Zod
        const fromParsed = exchangeRateSchema.parse(fromData);
        const toParsed = exchangeRateSchema.parse(toData);

        // Extract mid values from the first rates entry
        const fromMid = fromParsed.rates[0]?.mid;
        const toMid = toParsed.rates[0]?.mid;

        if (fromMid == null || toMid == null) {
          throw new Error("Missing exchange rate data");
        }

        // Calculate exchange rate
        const exchangeRate = fromMid / toMid;
        return exchangeRate;
      } catch (error) {
        console.error("Error fetching exchange rate:", error);
        throw new Error("Could not retrieve exchange rate");
      }
    },
  };
}
