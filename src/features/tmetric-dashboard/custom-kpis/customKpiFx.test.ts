import { describe, expect, it } from "vitest";
import { convertAmountBetweenCurrencies } from "./customKpiFx";

describe("convertAmountBetweenCurrencies", () => {
  it("returns the same amount when currencies match", () => {
    const map = new Map<string, number>();
    expect(convertAmountBetweenCurrencies(42, "PLN", "PLN", map)).toBe(42);
  });

  it("multiplies by the rate map entry", () => {
    const map = new Map<string, number>([["PLN->EUR", 0.23]]);
    expect(convertAmountBetweenCurrencies(100, "PLN", "EUR", map)).toBe(23);
  });

  it("returns null when the rate is missing", () => {
    const map = new Map<string, number>();
    expect(convertAmountBetweenCurrencies(100, "PLN", "EUR", map)).toBe(null);
  });
});
