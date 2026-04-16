import {
  DEFAULT_EMAIL_REPLY_INVITE_INVOICE,
  DEFAULT_EMAIL_REPLY_INVITE_REMINDER,
} from "./emailReplyInviteCopy";
import { markdownEmailBodyToHtml } from "./emailBodyMarkdown";
import { interpolateEmailSubject } from "./emailSubjectTemplate";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Reminder “payment due” line(s) as Gmail-safe HTML (same wording as the built-in template).
 */
export function buildReminderPaymentParagraphHtml(
  dueDateFormatted: string,
  relativeDateText: string,
): string {
  if (!dueDateFormatted) return "";
  const dueEsc = escapeHtml(dueDateFormatted);
  const relEsc = escapeHtml(relativeDateText);
  if (relativeDateText === "overdue") {
    return `<p style="margin:0 0 8px 0">We would appreciate receiving the payment that was due on <strong>${dueEsc}</strong>.</p>`;
  }
  if (relativeDateText) {
    return `<p style="margin:0 0 8px 0">We would be happy to receive the payment <strong>${relEsc}</strong> (${dueEsc}).</p>`;
  }
  return `<p style="margin:0 0 8px 0">We would be happy to receive the payment on <strong>${dueEsc}</strong>.</p>`;
}

/** Default invoice body when none is configured (Markdown; `{{…}}` then rendered to HTML). */
export const DEFAULT_INVOICE_EMAIL_BODY_MARKDOWN = `**Hello,**

Please find below a summary of time & billing for the period **{{period_from}} to {{period_to}}**.

${DEFAULT_EMAIL_REPLY_INVITE_INVOICE}`;

/**
 * Default reminder body when none is configured.
 * `{{payment_paragraph_html}}` is substituted before Markdown→HTML so the payment block stays raw HTML.
 */
export const DEFAULT_REMINDER_EMAIL_BODY_MARKDOWN = `**Hello,**

This is a gentle reminder regarding the invoice for the time & billing summary covering the period **{{period_from}} to {{period_to}}**.

{{payment_paragraph_html}}

Please find the summary below for your review.

${DEFAULT_EMAIL_REPLY_INVITE_REMINDER}`;

export type ReminderBodyInterpolationInput = {
  periodFrom: string;
  periodTo: string;
  workspaceName: string;
  clientName: string;
  paymentParagraphHtml: string;
};

export function reminderBodyInterpolationVars(
  input: ReminderBodyInterpolationInput,
): Record<string, string> {
  const period_from = escapeHtml(input.periodFrom);
  const period_to = escapeHtml(input.periodTo);
  return {
    period_from,
    period_to,
    from: period_from,
    to: period_to,
    workspace_name: escapeHtml(input.workspaceName),
    client_name: escapeHtml(input.clientName),
    payment_paragraph_html: input.paymentParagraphHtml,
  };
}

export type InvoiceBodyInterpolationInput = {
  periodFrom: string;
  periodTo: string;
  workspaceName: string;
  clientName: string;
};

export function invoiceBodyInterpolationVars(
  input: InvoiceBodyInterpolationInput,
): Record<string, string> {
  const period_from = escapeHtml(input.periodFrom);
  const period_to = escapeHtml(input.periodTo);
  return {
    period_from,
    period_to,
    from: period_from,
    to: period_to,
    workspace_name: escapeHtml(input.workspaceName),
    client_name: escapeHtml(input.clientName),
  };
}

export function resolveReminderEmailBodyHtml(
  templateFromCube: string | null | undefined,
  vars: Record<string, string>,
): string {
  const tmpl =
    templateFromCube?.trim() || DEFAULT_REMINDER_EMAIL_BODY_MARKDOWN;
  const interpolated = interpolateEmailSubject(tmpl, vars);
  return markdownEmailBodyToHtml(interpolated);
}

export function resolveInvoiceEmailBodyHtml(
  templateFromCube: string | null | undefined,
  vars: Record<string, string>,
): string {
  const tmpl =
    templateFromCube?.trim() || DEFAULT_INVOICE_EMAIL_BODY_MARKDOWN;
  const interpolated = interpolateEmailSubject(tmpl, vars);
  return markdownEmailBodyToHtml(interpolated);
}

function readTrimmedFromCubeSource(
  cubeData: Record<string, unknown>,
  key: string,
): string | null {
  const meta = cubeData.meta;
  if (!meta || typeof meta !== "object") return null;
  const source = (meta as Record<string, unknown>).source;
  if (!source || typeof source !== "object") return null;
  const raw = (source as Record<string, unknown>)[key];
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return t.length > 0 ? t : null;
}

/** Markdown body template from cube snapshot. */
export function readReminderEmailBodyTemplateFromCubeData(
  cubeData: Record<string, unknown>,
): string | null {
  return readTrimmedFromCubeSource(
    cubeData,
    "reminderEmailBodyMarkdownTemplate",
  );
}

/** Markdown body template from cube snapshot. */
export function readInvoiceEmailBodyTemplateFromCubeData(
  cubeData: Record<string, unknown>,
): string | null {
  return readTrimmedFromCubeSource(
    cubeData,
    "invoiceEmailBodyMarkdownTemplate",
  );
}
