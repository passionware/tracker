import type { BillingMatcherDraftMatch } from "@/features/billing/billingMatcher.types.ts";
import type { BillingMatchInput } from "@/services/front/AiMatchingService/AiMatchingService.ts";
import { BillingViewEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import type { CalendarDate } from "@internationalized/date";

export const MATCHER_READ_ONLY_BOX =
  "rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5";

export function billingsToMatchInput(
  entries: BillingViewEntry[],
): BillingMatchInput[] {
  return entries.map((e) => ({
    id: e.id,
    clientName: e.client.name?.trim() || `Client #${e.client.id}`,
    totalGross: e.grossAmount.amount,
    totalNet: e.netAmount.amount,
    currency: e.netAmount.currency,
    invoiceDate: e.invoiceDate.toString(),
  }));
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",")
        ? (result.split(",")[1] ?? result)
        : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function guessMimeType(file: File): string {
  if (file.type && file.type.length > 0) {
    return file.type;
  }
  const n = file.name.toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".csv")) return "text/csv";
  if (n.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}

export function confidenceBadgeProps(
  c: BillingMatcherDraftMatch["confidence"],
): {
  tone: "solid" | "secondary";
  variant: "positive" | "warning" | "neutral";
} {
  switch (c) {
    case "high":
      return { tone: "solid", variant: "positive" };
    case "medium":
      return { tone: "solid", variant: "warning" };
    default:
      return { tone: "secondary", variant: "neutral" };
  }
}

/** Calendar-day delta (local date, no DST — invoice vs payment). */
export function calendarDaysBetween(
  invoiceDate: CalendarDate,
  paidDate: CalendarDate,
): number {
  const a = new Date(invoiceDate.year, invoiceDate.month - 1, invoiceDate.day);
  const b = new Date(paidDate.year, paidDate.month - 1, paidDate.day);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function paymentLagHint(
  invoiceDate: CalendarDate,
  paidDate: CalendarDate,
): string {
  const d = calendarDaysBetween(invoiceDate, paidDate);
  if (d === 0) return "Same day as invoice";
  if (d > 0) return `Payment ${d} day${d === 1 ? "" : "s"} after invoice`;
  const abs = Math.abs(d);
  return `Payment ${abs} day${abs === 1 ? "" : "s"} before invoice`;
}
