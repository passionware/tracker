import type { Billing } from "@/api/billing/billing.api.ts";

export type BillingInvoicePositionRow = Billing["linkBillingReport"][number];

export function billingInvoiceRateGroupKey(
  rate: number,
  unitLabel: string,
): string {
  return `${formatPlainDecimal(rate)}|${unitLabel}`;
}

export function formatPlainDecimal(n: number, maxDecimals = 6): string {
  if (!Number.isFinite(n)) return "";
  const s = n.toFixed(maxDecimals);
  return s.replace(/\.?0+$/, "") || "0";
}

export type BillingInvoicePositionLine =
  | { kind: "single"; row: BillingInvoicePositionRow }
  | {
      kind: "group";
      rateKey: string;
      rows: BillingInvoicePositionRow[];
      rate: number;
      unitLabel: string;
    };

export function buildBillingInvoicePositionLines(
  rows: BillingInvoicePositionRow[],
  groupByRate: boolean,
  getRateKey: (row: BillingInvoicePositionRow) => string | null,
): BillingInvoicePositionLine[] {
  if (!groupByRate) {
    return rows.map((row) => ({ kind: "single", row }));
  }

  const seenKeys: string[] = [];
  const groups = new Map<string, BillingInvoicePositionRow[]>();
  const withoutRate: BillingInvoicePositionRow[] = [];

  for (const row of rows) {
    const rateKey = getRateKey(row);
    if (rateKey == null) {
      withoutRate.push(row);
      continue;
    }
    if (!groups.has(rateKey)) {
      seenKeys.push(rateKey);
      groups.set(rateKey, []);
    }
    groups.get(rateKey)!.push(row);
  }

  const lines: BillingInvoicePositionLine[] = [];
  for (const rateKey of seenKeys) {
    const groupRows = groups.get(rateKey)!;
    const parsed = parseBillingInvoiceRateKey(rateKey);
    lines.push({
      kind: "group",
      rateKey,
      rows: groupRows,
      rate: parsed?.rate ?? 0,
      unitLabel: parsed?.unitLabel ?? "",
    });
  }
  for (const row of withoutRate) {
    lines.push({
      kind: "group",
      rateKey: billingInvoiceNoRateLineKey(row.link.id),
      rows: [row],
      rate: 0,
      unitLabel: "",
    });
  }
  return lines;
}

export function billingInvoiceNoRateLineKey(linkId: number): string {
  return `no-rate|${linkId}`;
}

function parseBillingInvoiceRateKey(rateKey: string): {
  rate: number;
  unitLabel: string;
} | null {
  const sep = rateKey.indexOf("|");
  if (sep < 0) return null;
  const rate = Number(rateKey.slice(0, sep));
  if (!Number.isFinite(rate)) return null;
  return { rate, unitLabel: rateKey.slice(sep + 1) };
}
