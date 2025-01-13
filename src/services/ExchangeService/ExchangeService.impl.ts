import { ExchangeApi } from "@/api/exchange/exchange.api.ts";
import { ExchangeService } from "@/services/ExchangeService/ExchangeService.ts";
import { rd } from "@passionware/monads";
import { QueryClient, useQuery } from "@tanstack/react-query";

export function createExchangeService(
  api: ExchangeApi,
  queryClient: QueryClient,
): ExchangeService {
  function useExchangeRate(from: string, to: string) {
    return useQuery(
      {
        queryKey: ["exchange", from, to],
        queryFn: () => api.getExchangeRate(from, to),
      },
      queryClient,
    );
  }
  function fetchExchangeRate(from: string, to: string) {
    return queryClient.fetchQuery({
      queryKey: ["exchange", from, to],
      queryFn: () => api.getExchangeRate(from, to),
    });
  }

  return {
    useExchange: (from, to, amount) => {
      return rd.useMemoMap(useExchangeRate(from, to), (x) => x * amount);
    },
    ensureExchange: async (from, to, amount) => {
      return (await fetchExchangeRate(from, to)) * amount;
    },
  };
}
