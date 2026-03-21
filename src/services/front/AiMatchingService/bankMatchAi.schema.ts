import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const bankMatchAiMatchLoose$ = z.object({
  billingId: z.number().int(),
  paidAt: isoDate.optional().nullable(),
  /** Transfer title / remittance / description — often contains invoice no. or client ref. */
  paymentTitle: z.string().optional().nullable(),
  /** Signed or absolute amount from the bank line (number preferred). */
  paymentAmount: z.union([z.number(), z.string(), z.null()]).optional(),
  paymentSummary: z.string().optional().nullable(),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  justification: z.string().optional().nullable(),
});

const bankMatchAiResponseLoose$ = z.object({
  matches: z.array(bankMatchAiMatchLoose$),
  unmatchedBillingIds: z.array(z.number().int()),
  unmatchedPaymentHints: z.array(z.string()).optional().default([]),
});

export type BankMatchAiResponse = {
  matches: Array<{
    billingId: number;
    paidAt: string;
    paymentTitle: string;
    /** Absolute payment amount when parsable; null if unknown. */
    paymentAmount: number | null;
    paymentSummary: string;
    confidence: "high" | "medium" | "low";
    justification: string;
  }>;
  unmatchedBillingIds: number[];
  unmatchedPaymentHints: string[];
};

function normalizePaidAt(paidAt: string | null | undefined): string {
  if (paidAt && /^\d{4}-\d{2}-\d{2}$/.test(paidAt)) {
    return paidAt;
  }
  return new Date().toISOString().slice(0, 10);
}

function normalizePaymentAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.abs(raw);
  }
  if (typeof raw === "string") {
    const cleaned = raw.replace(/\s/g, "").replace(",", ".");
    const n = parseFloat(cleaned.replace(/^[^\d.-]+/, ""));
    return Number.isFinite(n) ? Math.abs(n) : null;
  }
  return null;
}

/**
 * Parse Gemini JSON (file-based matching — no CSV row indices).
 */
export function parseBankMatchAiJson(raw: string): BankMatchAiResponse {
  const trimmed = raw.trim();
  let jsonText = trimmed;
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) {
    jsonText = fence[1].trim();
  }
  const data: unknown = JSON.parse(jsonText);
  const loose = bankMatchAiResponseLoose$.parse(data);

  return {
    matches: loose.matches.map((m) => ({
      billingId: m.billingId,
      paidAt: normalizePaidAt(m.paidAt),
      paymentTitle: (m.paymentTitle ?? "").trim(),
      paymentAmount: normalizePaymentAmount(m.paymentAmount),
      paymentSummary: (m.paymentSummary ?? "").trim(),
      confidence: m.confidence ?? "medium",
      justification: (m.justification ?? "").trim(),
    })),
    unmatchedBillingIds: loose.unmatchedBillingIds,
    unmatchedPaymentHints: loose.unmatchedPaymentHints ?? [],
  };
}
