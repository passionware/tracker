import { CalendarDate, parseDate } from "@internationalized/date";

/** Default closing paragraph text baked into built-in invoice body HTML template. */
export const DEFAULT_EMAIL_REPLY_INVITE_INVOICE =
  "If anything needs clarification, reply to this email. Otherwise, please confirm so we can issue the invoice(s).";

/** Default closing paragraph text baked into built-in reminder body HTML template. */
export const DEFAULT_EMAIL_REPLY_INVITE_REMINDER =
  "If you need any clarification or have questions, please don't hesitate to reply to this email. We're here to help.";

/**
 * Payment due date set at publish time (`cube_data.meta.source.billingDueDate`, `YYYY-MM-DD`).
 */
export function readBillingDueDateFromCubeData(
  cubeData: Record<string, unknown>,
): CalendarDate | null {
  const meta = cubeData.meta;
  if (!meta || typeof meta !== "object") return null;
  const source = (meta as Record<string, unknown>).source;
  if (!source || typeof source !== "object") return null;
  const raw = (source as Record<string, unknown>).billingDueDate;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  try {
    return parseDate(t);
  } catch {
    return null;
  }
}
