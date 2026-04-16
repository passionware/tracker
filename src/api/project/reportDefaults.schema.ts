import { z } from "zod";

/** Stored JSON uses snake_case keys (invoice_email.title_template, …). */
const reportDefaultsRowSchema = z
  .object({
    email_reply_invite_message: z.string().nullable().optional(),
    invoice_email: z
      .object({
        title_template: z.string().nullable().optional(),
      })
      .partial()
      .optional(),
    reminder_email: z
      .object({
        title_template: z.string().nullable().optional(),
      })
      .partial()
      .optional(),
  })
  .partial()
  .passthrough();

export type ReportEmailDefaults = {
  titleTemplate?: string | null;
};

/** Domain shape (camelCase); persisted under `project.report_defaults` with snake_case keys. */
export type ReportDefaults = {
  emailReplyInviteMessage?: string | null;
  invoiceEmail?: ReportEmailDefaults;
  reminderEmail?: ReportEmailDefaults;
};

export const emptyReportDefaults = (): ReportDefaults => ({});

export function parseReportDefaults(raw: unknown): ReportDefaults {
  const parsed = reportDefaultsRowSchema.safeParse(raw);
  if (!parsed.success) {
    return {};
  }
  const v = parsed.data;
  const out: ReportDefaults = {};
  if (v.email_reply_invite_message != null && v.email_reply_invite_message !== "") {
    out.emailReplyInviteMessage = v.email_reply_invite_message;
  }
  const inv = v.invoice_email?.title_template;
  if (inv != null && inv !== "") {
    out.invoiceEmail = { titleTemplate: inv };
  }
  const rem = v.reminder_email?.title_template;
  if (rem != null && rem !== "") {
    out.reminderEmail = { titleTemplate: rem };
  }
  return out;
}

/**
 * JSON for Supabase `p_report_defaults` (shallow-merged with existing row via `||` in RPC).
 * Explicit nulls clear optional strings / nested templates.
 */
export function serializeReportDefaultsForRpc(
  defaults: ReportDefaults,
): Record<string, unknown> {
  return {
    email_reply_invite_message:
      defaults.emailReplyInviteMessage == null ||
      defaults.emailReplyInviteMessage === ""
        ? null
        : defaults.emailReplyInviteMessage.trim(),
    invoice_email: {
      title_template:
        defaults.invoiceEmail?.titleTemplate == null ||
        defaults.invoiceEmail.titleTemplate === ""
          ? null
          : defaults.invoiceEmail.titleTemplate.trim(),
    },
    reminder_email: {
      title_template:
        defaults.reminderEmail?.titleTemplate == null ||
        defaults.reminderEmail.titleTemplate === ""
          ? null
        : defaults.reminderEmail.titleTemplate.trim(),
    },
  };
}
