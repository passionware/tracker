import { describe, expect, it } from "vitest";
import { evaluateKpi, validateKpi } from "./customKpiExpression.ts";

describe("evaluateKpi", () => {
  it("evaluates a single number", () => {
    expect(evaluateKpi("42", {})).toEqual({ ok: true, value: 42 });
  });

  it("evaluates a decimal number", () => {
    expect(evaluateKpi("3.14", {})).toEqual({ ok: true, value: 3.14 });
  });

  it("respects operator precedence", () => {
    expect(evaluateKpi("1 + 2 * 3", {})).toEqual({ ok: true, value: 7 });
    expect(evaluateKpi("(1 + 2) * 3", {})).toEqual({ ok: true, value: 9 });
  });

  it("supports unary minus", () => {
    expect(evaluateKpi("-5 + 2", {})).toEqual({ ok: true, value: -3 });
    expect(evaluateKpi("--5", {})).toEqual({ ok: true, value: 5 });
  });

  it("substitutes variables", () => {
    expect(evaluateKpi("cost + profit", { cost: 10, profit: 5 })).toEqual({
      ok: true,
      value: 15,
    });
  });

  it("missing variables default to 0 in evaluateKpi", () => {
    expect(evaluateKpi("cost + profit", { cost: 10 })).toEqual({
      ok: true,
      value: 10,
    });
  });

  it("returns null on division by zero", () => {
    expect(evaluateKpi("10 / 0", {})).toEqual({ ok: true, value: null });
  });

  it("propagates null through arithmetic", () => {
    expect(evaluateKpi("(10 / 0) + 5", {})).toEqual({ ok: true, value: null });
  });

  it("reports unexpected characters", () => {
    const r = evaluateKpi("10 $ 5", {});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.position).toBe(3);
    }
  });

  it("reports missing closing paren", () => {
    const r = evaluateKpi("(1 + 2", {});
    expect(r.ok).toBe(false);
  });

  it("reports empty formula", () => {
    const r = evaluateKpi("   ", {});
    expect(r.ok).toBe(false);
  });

  it("reports trailing tokens", () => {
    const r = evaluateKpi("1 2", {});
    expect(r.ok).toBe(false);
  });
});

describe("validateKpi", () => {
  const known = new Set(["cost", "totalProfit"]);

  it("accepts known variables", () => {
    expect(validateKpi("cost + totalProfit", known).ok).toBe(true);
  });

  it("rejects unknown variables", () => {
    const r = validateKpi("cost + foo", known);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain("foo");
    }
  });

  it("accepts pure numeric formulas", () => {
    expect(validateKpi("1 + 2", known).ok).toBe(true);
  });
});
