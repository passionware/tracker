import { maybe } from "@passionware/monads";
import { z } from "zod";

/** Stored JSON uses snake_case keys (`body_markdown_template`, …). */
const reportEmailRowSchema = z
  .object({
    title_template: z.string().nullable().optional(),
    body_markdown_template: z.string().nullable().optional(),
  })
  .passthrough();

const reportDefaultsRowSchema = z
  .object({
    invoice_email: reportEmailRowSchema.optional(),
    reminder_email: reportEmailRowSchema.optional(),
  })
  .partial()
  .passthrough();

export type ReportEmailDefaults = {
  titleTemplate?: string | null;
  /** Markdown with `{{placeholders}}`; rendered to inline-styled HTML in the app. */
  bodyMarkdownTemplate?: string | null;
};

/** Domain shape (camelCase); persisted under `project.report_defaults` with snake_case keys. */
export type ReportDefaults = {
  invoiceEmail?: ReportEmailDefaults;
  reminderEmail?: ReportEmailDefaults;
};

export const emptyReportDefaults = (): ReportDefaults => ({});

/** Trim, drop empty / whitespace-only, then `null` for JSON-RPC (Supabase). */
function optionalTrimmedTextForRpc(
  s: string | null | undefined,
): string | null {
  return maybe.getOrNull(
    maybe.map(s, (raw) => maybe.fromTruthy(raw.trim())),
  );
}

function trimOrUndefined(s: string | null | undefined): string | undefined {
  if (s == null) return undefined;
  const t = s.trim();
  return t.length > 0 ? t : undefined;
}

type ParsedReportEmailRow = z.infer<typeof reportEmailRowSchema>;

function emailRowToDomain(
  row: ParsedReportEmailRow | undefined,
): ReportEmailDefaults | undefined {
  if (row == null) return undefined;
  const titleTemplate = trimOrUndefined(row.title_template);
  const bodyMarkdownTemplate = trimOrUndefined(row.body_markdown_template);
  const out: ReportEmailDefaults = {};
  if (titleTemplate != null) out.titleTemplate = titleTemplate;
  if (bodyMarkdownTemplate != null) out.bodyMarkdownTemplate = bodyMarkdownTemplate;
  return Object.keys(out).length > 0 ? out : undefined;
}

export function parseReportDefaults(raw: unknown): ReportDefaults {
  const parsed = reportDefaultsRowSchema.safeParse(raw);
  if (!parsed.success) {
    return {};
  }
  const { invoice_email, reminder_email } = parsed.data;
  const out: ReportDefaults = {};
  const inv = emailRowToDomain(invoice_email);
  if (inv != null) out.invoiceEmail = inv;
  const rem = emailRowToDomain(reminder_email);
  if (rem != null) out.reminderEmail = rem;
  return out;
}

/**
 * JSON fragment merged into `project.report_defaults` on save (`||` in RPC).
 */
export function serializeReportDefaultsForRpc(
  defaults: ReportDefaults,
): Record<string, unknown> {
  return {
    invoice_email: {
      title_template: optionalTrimmedTextForRpc(
        defaults.invoiceEmail?.titleTemplate,
      ),
      body_markdown_template: optionalTrimmedTextForRpc(
        defaults.invoiceEmail?.bodyMarkdownTemplate,
      ),
    },
    reminder_email: {
      title_template: optionalTrimmedTextForRpc(
        defaults.reminderEmail?.titleTemplate,
      ),
      body_markdown_template: optionalTrimmedTextForRpc(
        defaults.reminderEmail?.bodyMarkdownTemplate,
      ),
    },
  };
}
