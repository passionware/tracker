import { ExchangeApi } from "@/api/exchange/exchange.api.ts";
import { Mock } from "vitest";

export function createExchangeApi(
  mock: Mock<() => Promise<number>>,
): ExchangeApi {
  return {
    getExchangeRate: mock,
  };
}
