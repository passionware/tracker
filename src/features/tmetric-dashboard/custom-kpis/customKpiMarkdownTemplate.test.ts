import { describe, expect, it } from "vitest";
import {
  interpolateCustomKpiMustaches,
  markdownTemplateNeedsFxRates,
  parseMustacheInner,
  renderCustomKpiMarkdown,
  validateCustomKpiMarkdownTemplate,
} from "./customKpiMarkdownTemplate";
import { CUSTOM_KPI_VARIABLES } from "./customKpi.types";

const VARS = {
  cost: 100,
  billing: 200,
  profit: 100,
  hours: 8,
  entries: 5,
  totalCost: 500,
  totalBilling: 800,
  totalProfit: 300,
  totalHours: 40,
  totalEntries: 20,
};

const KNOWN = new Set(CUSTOM_KPI_VARIABLES);

describe("parseMustacheInner", () => {
  it("parses format()", () => {
    expect(
      parseMustacheInner(`format( cost + totalProfit , 'currency', 'eur' )`),
    ).toEqual({
      kind: "format",
      expr: "cost + totalProfit",
      display: "currency",
      currency: "eur",
    });
  });

  it("parses plain expression", () => {
    expect(parseMustacheInner("hours")).toEqual({
      kind: "expr",
      expr: "hours",
    });
  });

  it("parses convert()", () => {
    expect(parseMustacheInner(`convert( profit , 'eur' )`)).toEqual({
      kind: "convert",
      expr: "profit",
      targetCurrency: "EUR",
    });
  });
});

describe("interpolateCustomKpiMustaches", () => {
  it("interpolates format with explicit currency (same as base, no FX)", () => {
    const r = interpolateCustomKpiMustaches(
      "x {{format(cost+totalProfit, 'currency', 'PLN')}} y",
      VARS,
      "number",
      "PLN",
      null,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.text.startsWith("x ")).toBe(true);
      expect(r.text.endsWith(" y")).toBe(true);
      expect(r.text).not.toContain("{{");
    }
  });

  it("converts format(..., 'currency', target) from KPI base when fx is provided", () => {
    const rateMap = new Map<string, number>([["PLN->EUR", 0.25]]);
    const r = interpolateCustomKpiMustaches(
      "{{format(profit, 'currency', 'eur')}}",
      VARS,
      "number",
      "PLN",
      { expressionBaseCurrency: "PLN", rateMap },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.text).not.toContain("100");
      expect(r.text).toContain("25");
    }
  });

  it("converts convert(expr, target) from KPI base when fx is provided", () => {
    const rateMap = new Map<string, number>([["PLN->USD", 2]]);
    const r = interpolateCustomKpiMustaches(
      "{{ convert(profit, 'usd') }}",
      VARS,
      "number",
      "PLN",
      { expressionBaseCurrency: "PLN", rateMap },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.text).toContain("200");
    }
  });
});

describe("renderCustomKpiMarkdown", () => {
  it("renders heading and kpi fence", () => {
    const md = `# Hi\n\n\`\`\`kpi\n{{format(hours, 'hours')}}\n\`\`\``;
    const r = renderCustomKpiMarkdown(md, VARS, "number", "PLN", null);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.html).toContain("Hi");
      expect(r.html).toContain("text-2xl");
      expect(r.html).toMatch(/8\.0|8,0/);
    }
  });
});

describe("validateCustomKpiMarkdownTemplate", () => {
  it("accepts valid template", () => {
    const v = validateCustomKpiMarkdownTemplate(
      "{{ hours }} and {{ format(profit, 'currency', 'PLN') }}",
      KNOWN,
    );
    expect(v.ok).toBe(true);
  });

  it("rejects unknown variable", () => {
    const v = validateCustomKpiMarkdownTemplate("{{ foo }}", KNOWN);
    expect(v.ok).toBe(false);
  });

  it("accepts convert()", () => {
    const v = validateCustomKpiMarkdownTemplate("{{ convert(profit, 'EUR') }}", KNOWN);
    expect(v.ok).toBe(true);
  });
});

describe("markdownTemplateNeedsFxRates", () => {
  it("is true when format targets a currency other than KPI base", () => {
    expect(
      markdownTemplateNeedsFxRates(
        "{{ format(profit, 'currency', 'usd') }}",
        "PLN",
      ),
    ).toBe(true);
  });

  it("is false when only non-currency vars and format matches KPI base", () => {
    expect(
      markdownTemplateNeedsFxRates(
        "{{ format(hours, 'currency', 'pln') }}",
        "PLN",
      ),
    ).toBe(false);
  });
});
