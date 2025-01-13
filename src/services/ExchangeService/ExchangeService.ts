import { RemoteData } from "@passionware/monads";

export interface ExchangeService {
  useExchange: (from: string, to: string, amount: number) => RemoteData<number>;
  ensureExchange: (from: string, to: string, amount: number) => Promise<number>;
}
