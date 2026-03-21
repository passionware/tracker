import type { CalendarDate } from "@internationalized/date";

export type BillingMatcherDraftMatch = {
  key: string;
  billingId: number;
  paidAt: CalendarDate;
  justification: string;
  /** Short transfer title / remittance line (often contains invoice ref). */
  paymentTitle: string;
  /** Absolute amount from bank line when known. */
  paymentAmount: number | null;
  paymentSummary: string;
  confidence: "high" | "medium" | "low";
};
