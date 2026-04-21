import { Marked, Renderer, type RendererObject, type Tokens } from "marked";
import {
  CUSTOM_KPI_CURRENCY_VARIABLES,
  CUSTOM_KPI_DISPLAYS,
  type CustomKpiDisplay,
} from "./customKpi.types";
import { evaluateKpi, validateKpi, type EvaluateResult } from "./customKpiExpression";
import { formatKpiValue } from "./customKpiFormat";
import { convertAmountBetweenCurrencies } from "./customKpiFx";
import type { CustomDashboardKpi } from "./customKpi.types";

const KPI_BLOCK_SENTINEL = (n: number) => `<!--CUSTOM_KPI_MD_BLOCK_${n}-->`;

const MUSTACHE_RE = /\{\{([\s\S]*?)\}\}/g;

const FORMAT_RE =
  /^\s*format\s*\(\s*([\s\S]+?)\s*,\s*'([^']+)'\s*(?:,\s*'([^']*)'\s*)?\)\s*$/i;

const CONVERT_RE =
  /^\s*convert\s*\(\s*([\s\S]+?)\s*,\s*'([A-Za-z]{3})'\s*\)\s*$/i;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isCustomKpiDisplay(s: string): s is CustomKpiDisplay {
  return (CUSTOM_KPI_DISPLAYS as readonly string[]).includes(s);
}

export type ParsedMustache =
  | { kind: "format"; expr: string; display: CustomKpiDisplay; currency?: string }
  | { kind: "convert"; expr: string; targetCurrency: string }
  | { kind: "expr"; expr: string };

export function parseMustacheInner(inner: string): ParsedMustache | null {
  const t = inner.trim();
  if (!t) return null;
  FORMAT_RE.lastIndex = 0;
  const fm = FORMAT_RE.exec(t);
  if (fm) {
    const displayRaw = (fm[2] ?? "").toLowerCase();
    if (!isCustomKpiDisplay(displayRaw)) return null;
    return {
      kind: "format",
      expr: fm[1]!.trim(),
      display: displayRaw,
      currency: fm[3]?.trim(),
    };
  }
  CONVERT_RE.lastIndex = 0;
  const cv = CONVERT_RE.exec(t);
  if (cv) {
    return {
      kind: "convert",
      expr: cv[1]!.trim(),
      targetCurrency: cv[2]!.toUpperCase(),
    };
  }
  return { kind: "expr", expr: t };
}

/** Values in `vars` are always in this currency (KPI “base currency”). */
export type CustomKpiMarkdownFx = {
  expressionBaseCurrency: string;
  rateMap: Map<string, number>;
};

function evaluateMustache(
  parsed: ParsedMustache,
  vars: Record<string, number>,
  defaultDisplay: CustomKpiDisplay,
  defaultCurrency: string,
  fx: CustomKpiMarkdownFx | null,
): string {
  const expr = parsed.expr;
  const ev = evaluateKpi(expr, vars);
  if (!ev.ok || ev.value === null) return "—";
  const rawValue = ev.value;

  if (parsed.kind === "convert") {
    const target = parsed.targetCurrency.toUpperCase();
    const base = (fx?.expressionBaseCurrency ?? defaultCurrency).toUpperCase();
    if (target === base) {
      return formatKpiValue(rawValue, "currency", target);
    }
    if (!fx) return "—";
    const converted = convertAmountBetweenCurrencies(
      rawValue,
      base,
      target,
      fx.rateMap,
    );
    if (converted === null) return "—";
    return formatKpiValue(converted, "currency", target);
  }

  const display =
    parsed.kind === "format" ? parsed.display : defaultDisplay;
  const currency =
    parsed.kind === "format" && parsed.currency
      ? parsed.currency.toUpperCase()
      : defaultCurrency.toUpperCase();
  let value = rawValue;
  if (
    parsed.kind === "format" &&
    display === "currency" &&
    fx &&
    currency !== fx.expressionBaseCurrency.toUpperCase()
  ) {
    const c = convertAmountBetweenCurrencies(
      value,
      fx.expressionBaseCurrency,
      currency,
      fx.rateMap,
    );
    if (c === null) return "—";
    value = c;
  }
  return formatKpiValue(value, display, currency);
}

/**
 * Interpolates `{{ expression }}` and `{{ format(expr, 'display', 'CUR') }}` in a string.
 */
export function interpolateCustomKpiMustaches(
  source: string,
  vars: Record<string, number>,
  defaultDisplay: CustomKpiDisplay,
  defaultCurrency: string,
  fx: CustomKpiMarkdownFx | null = null,
): { ok: true; text: string } | { ok: false; error: string } {
  MUSTACHE_RE.lastIndex = 0; // global regex; avoid stale lastIndex between calls
  let last = 0;
  let out = "";
  let m: RegExpExecArray | null;
  while ((m = MUSTACHE_RE.exec(source)) !== null) {
    out += source.slice(last, m.index);
    last = m.index + m[0].length;
    const inner = m[1] ?? "";
    const parsed = parseMustacheInner(inner);
    if (!parsed) {
      return { ok: false, error: "Empty {{ }} expression" };
    }
    const expr = parsed.expr;
    const check = evaluateKpi(expr, vars);
    if (!check.ok) {
      return { ok: false, error: check.error };
    }
    out += evaluateMustache(parsed, vars, defaultDisplay, defaultCurrency, fx);
  }
  out += source.slice(last);
  return { ok: true, text: out };
}

const kpiMarkdownRenderer: RendererObject = {
  paragraph({ tokens }: Tokens.Paragraph) {
    return `<p class="mb-2 text-sm leading-snug text-foreground last:mb-0">${this.parser.parseInline(tokens)}</p>\n`;
  },
  heading({ tokens, depth }: Tokens.Heading) {
    const cls =
      depth <= 1
        ? "mb-2 text-base font-semibold tracking-tight text-foreground"
        : depth === 2
          ? "mb-1.5 text-sm font-semibold text-foreground"
          : "mb-1.5 text-sm font-medium text-foreground";
    return `<h${depth} class="${cls}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
  },
  blockquote({ tokens }: Tokens.Blockquote) {
    const body = this.parser.parse(tokens);
    return `<blockquote class="mb-2 border-l-2 border-muted-foreground/30 pl-3 text-sm text-muted-foreground">${body}</blockquote>\n`;
  },
  hr() {
    return `<hr class="my-3 border-border" />\n`;
  },
  list(token: Tokens.List) {
    const raw = Renderer.prototype.list.call(this, token) as string;
    const tag = token.ordered ? "ol" : "ul";
    const listCls = token.ordered
      ? "mb-2 list-inside list-decimal space-y-0.5 pl-1 text-sm marker:text-muted-foreground"
      : "mb-2 list-inside list-disc space-y-0.5 pl-1 text-sm marker:text-muted-foreground";
    return raw.replace(new RegExp(`^<${tag}`), `<${tag} class="${listCls}"`);
  },
  listitem(item: Tokens.ListItem) {
    const raw = Renderer.prototype.listitem.call(this, item) as string;
    return raw.replace("<li>", `<li class="leading-snug">`);
  },
  code(token: Tokens.Code) {
    const escaped = escapeHtml(token.text);
    return `<pre class="mb-2 overflow-x-auto rounded-md border bg-muted/40 p-2 text-xs"><code class="font-mono text-muted-foreground">${escaped}</code></pre>\n`;
  },
  codespan(token: Tokens.Codespan) {
    return `<code class="rounded bg-muted/60 px-1 py-0.5 font-mono text-xs">${escapeHtml(token.text)}</code>`;
  },
  strong({ tokens }: Tokens.Strong) {
    return `<strong class="font-semibold text-foreground">${this.parser.parseInline(tokens)}</strong>`;
  },
  em({ tokens }: Tokens.Em) {
    return `<em class="italic">${this.parser.parseInline(tokens)}</em>`;
  },
  link(token: Tokens.Link) {
    const raw = Renderer.prototype.link.call(this, token) as string;
    return raw.replace(
      "<a ",
      `<a class="font-medium text-primary underline-offset-4 hover:underline" `,
    );
  },
};

const customKpiMarkdownMarked = new Marked({
  async: false,
  breaks: true,
  gfm: true,
  renderer: kpiMarkdownRenderer,
});

const KPI_FENCE_RE = /^```kpi\s*\n([\s\S]*?)```/gm;

export type RenderCustomKpiMarkdownResult =
  | { ok: true; html: string }
  | { ok: false; error: string };

/**
 * Full pipeline: extract ```kpi``` blocks → interpolate `{{ }}` → Markdown → HTML,
 * then inject KPI blocks as large tabular figures.
 */
export function renderCustomKpiMarkdown(
  markdown: string,
  vars: Record<string, number>,
  defaultDisplay: CustomKpiDisplay,
  defaultCurrency: string,
  fx: CustomKpiMarkdownFx | null = null,
): RenderCustomKpiMarkdownResult {
  KPI_FENCE_RE.lastIndex = 0;
  const kpiBodies: string[] = [];
  const working = markdown.replace(KPI_FENCE_RE, (_full, body: string) => {
    const idx = kpiBodies.length;
    kpiBodies.push(String(body));
    return `\n\n${KPI_BLOCK_SENTINEL(idx)}\n\n`;
  });

  const interp = interpolateCustomKpiMustaches(
    working,
    vars,
    defaultDisplay,
    defaultCurrency,
    fx,
  );
  if (!interp.ok) {
    return { ok: false, error: interp.error };
  }

  for (let i = 0; i < kpiBodies.length; i++) {
    const inner = interpolateCustomKpiMustaches(
      kpiBodies[i]!,
      vars,
      defaultDisplay,
      defaultCurrency,
      fx,
    );
    if (!inner.ok) {
      return { ok: false, error: `In \`\`\`kpi block: ${inner.error}` };
    }
    kpiBodies[i] = inner.text;
  }

  const trimmed = interp.text.trim();
  let html = trimmed
    ? (customKpiMarkdownMarked.parse(trimmed, { async: false }) as string)
    : "";

  for (let i = 0; i < kpiBodies.length; i++) {
    const blockHtml = `<div class="text-2xl font-semibold tabular-nums tracking-tight text-foreground">${escapeHtml(kpiBodies[i]!)}</div>`;
    html = html.replace(KPI_BLOCK_SENTINEL(i), blockHtml);
  }

  return { ok: true, html };
}

function expressionMentionsCurrencyVariable(expr: string): boolean {
  for (const name of CUSTOM_KPI_CURRENCY_VARIABLES) {
    const re = new RegExp(`(^|[^A-Za-z0-9_])${name}(?![A-Za-z0-9_])`);
    if (re.test(expr)) return true;
  }
  return false;
}

/** Whether the template references any currency-backed variable (needs FX rates). */
export function customKpiMarkdownTemplateUsesCurrency(markdown: string): boolean {
  const segments: string[] = [markdown];
  const fenceRe = /^```kpi\s*\n([\s\S]*?)```/gm;
  let fm: RegExpExecArray | null;
  while ((fm = fenceRe.exec(markdown)) !== null) {
    segments.push(fm[1] ?? "");
  }
  for (const segment of segments) {
    MUSTACHE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = MUSTACHE_RE.exec(segment)) !== null) {
      const inner = m[1] ?? "";
      const parsed = parseMustacheInner(inner);
      const expr = parsed?.expr ?? "";
      if (expressionMentionsCurrencyVariable(expr)) return true;
    }
  }
  return false;
}

/**
 * True when this Markdown KPI needs exchange rates: currency variables and/or
 * `format(..., 'currency', 'XXX')` or `convert(..., 'XXX')` where `XXX` ≠ KPI base currency.
 */
export function markdownTemplateNeedsFxRates(
  markdown: string,
  kpiBaseCurrency: string,
): boolean {
  if (customKpiMarkdownTemplateUsesCurrency(markdown)) return true;
  const base = kpiBaseCurrency.toUpperCase();
  const formatRe =
    /format\s*\([\s\S]+?,\s*'currency'\s*,\s*'([A-Za-z]{3})'\s*\)/gi;
  const convertRe = /convert\s*\([\s\S]+?,\s*'([A-Za-z]{3})'\s*\)/gi;
  formatRe.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = formatRe.exec(markdown)) !== null) {
    if (m[1].toUpperCase() !== base) return true;
  }
  convertRe.lastIndex = 0;
  while ((m = convertRe.exec(markdown)) !== null) {
    if (m[1].toUpperCase() !== base) return true;
  }
  return false;
}

/** Extra `from → to` pairs so we load rates for Markdown currency targets (e.g. PLN → EUR). */
export function collectMarkdownKpiFxRatePairs(
  kpis: Array<Pick<CustomDashboardKpi, "contentMode" | "formula" | "baseCurrency">>,
): { from: string; to: string }[] {
  const out: { from: string; to: string }[] = [];
  for (const k of kpis) {
    if (k.contentMode !== "markdown") continue;
    const base = k.baseCurrency.toUpperCase();
    const scan = (re: RegExp) => {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(k.formula)) !== null) {
        const t = m[1].toUpperCase();
        if (t !== base) out.push({ from: base, to: t });
      }
    };
    scan(/format\s*\([\s\S]+?,\s*'currency'\s*,\s*'([A-Za-z]{3})'\s*\)/gi);
    scan(/convert\s*\([\s\S]+?,\s*'([A-Za-z]{3})'\s*\)/gi);
  }
  return out;
}

export function validateCustomKpiMarkdownTemplate(
  markdown: string,
  knownNames: ReadonlySet<string>,
): EvaluateResult {
  MUSTACHE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MUSTACHE_RE.exec(markdown)) !== null) {
    const inner = m[1] ?? "";
    const parsed = parseMustacheInner(inner);
    if (!parsed) {
      return { ok: false, error: "Empty {{ }} expression", position: m.index };
    }
    const expr = parsed.expr;
    if (parsed.kind === "format" && !isCustomKpiDisplay(parsed.display)) {
      return {
        ok: false,
        error: `Invalid format display "${parsed.display}"`,
        position: m.index,
      };
    }
    const v = validateKpi(expr, knownNames);
    if (!v.ok) {
      return { ok: false, error: v.error, position: m.index };
    }
  }
  let fence: RegExpExecArray | null;
  KPI_FENCE_RE.lastIndex = 0;
  while ((fence = KPI_FENCE_RE.exec(markdown)) !== null) {
    const body = fence[1] ?? "";
    MUSTACHE_RE.lastIndex = 0;
    while ((m = MUSTACHE_RE.exec(body)) !== null) {
      const inner = m[1] ?? "";
      const parsed = parseMustacheInner(inner);
      if (!parsed) {
        return { ok: false, error: "Empty {{ }} in kpi block", position: fence.index };
      }
      const exprFence = parsed.expr;
      const v = validateKpi(exprFence, knownNames);
      if (!v.ok) {
        return { ok: false, error: v.error, position: fence.index };
      }
    }
  }
  return { ok: true, value: 0 };
}
