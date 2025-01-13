/** @jest-environment jsdom */
import { createExchangeApi } from "@/api/exchange/exchange.api.mock.ts";
import { createExchangeService } from "@/services/ExchangeService/ExchangeService.impl.ts";
import { rd } from "@passionware/monads";
import { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("ExchangeService", () => {
  const createTestExchangeService = (initialValue: number) => {
    const queryClient = new QueryClient();
    const mockFn = vi.fn().mockResolvedValue(initialValue);
    const api = createExchangeApi(mockFn);

    return {
      service: createExchangeService(api, queryClient),
      mockApi: mockFn,
    };
  };

  describe("useExchange", () => {
    it("should fetch and calculate the exchange rate using useExchange", async () => {
      const { service, mockApi } = createTestExchangeService(4.5);

      const { result } = renderHook(() =>
        service.useExchange("EUR", "PLN", 100),
      );

      await waitFor(() => {
        expect(result.current).toMatchObject(rd.of(450));
        expect(mockApi).toHaveBeenCalledWith("EUR", "PLN");
      });
    });
  });

  describe("ensureExchange", () => {
    it("should fetch and calculate the exchange rate using ensureExchange", async () => {
      const { service, mockApi } = createTestExchangeService(4.5);

      const result = await service.ensureExchange("EUR", "PLN", 100);

      expect(result).toEqual(450);
      expect(mockApi).toHaveBeenCalledWith("EUR", "PLN");
    });
  });
});
