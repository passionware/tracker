import { createExchangeApi } from "@/api/exchange/exchange.api.http.ts";

export const myExchangeApi = createExchangeApi(fetch);
