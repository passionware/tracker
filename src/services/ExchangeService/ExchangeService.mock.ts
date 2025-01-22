import { ExchangeService } from "@/services/ExchangeService/ExchangeService.ts";
import { rd } from "@passionware/monads";

export function createExchangeService(): ExchangeService {
  return {
    useExchange: (_from, _to, amount) => {
      return rd.of(amount * 2);
    },
    ensureExchange: async (_from, _to, amount) => {
      return amount * 2;
    },
    useExchangeRates: (spec) => {
      return rd.of(
        spec.map(({ from, to }) => ({
          from,
          to,
          rate: 2,
        })),
      );
    },
  };
}
