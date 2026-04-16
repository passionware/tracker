const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Default when project / cube meta has no custom invoice subject template. */
export const DEFAULT_EMAIL_SUBJECT_TEMPLATE_INVOICE =
  "Time & Billing Summary — {{from}} to {{to}}";

export type EmailSubjectInterpolationInput = {
  from: string;
  to: string;
  workspaceName: string;
  clientName: string;
  /** Formatted payment due date for reminder subjects; use "" when absent. */
  dueDate: string;
};

export function emailSubjectInterpolationVars(
  input: EmailSubjectInterpolationInput,
): Record<string, string> {
  const { from, to, workspaceName, clientName, dueDate } = input;
  const period =
    from && to ? `${from} to ${to}` : [from, to].filter(Boolean).join(" ");
  return { from, to, period, workspaceName, clientName, dueDate };
}

export function interpolateEmailSubject(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(PLACEHOLDER_RE, (_, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key]! : `{{${key}}}`,
  );
}

function readTrimmedStringFromCubeSource(
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

export function readEmailSubjectTemplateInvoiceFromCubeData(
  cubeData: Record<string, unknown>,
): string | null {
  return readTrimmedStringFromCubeSource(
    cubeData,
    "emailSubjectTemplateInvoice",
  );
}

export function readEmailSubjectTemplateReminderFromCubeData(
  cubeData: Record<string, unknown>,
): string | null {
  return readTrimmedStringFromCubeSource(
    cubeData,
    "emailSubjectTemplateReminder",
  );
}

export function resolveInvoiceEmailSubject(
  templateFromCube: string | null | undefined,
  vars: Record<string, string>,
): string {
  const tmpl =
    templateFromCube?.trim() || DEFAULT_EMAIL_SUBJECT_TEMPLATE_INVOICE;
  return interpolateEmailSubject(tmpl, vars);
}

export function resolveReminderEmailSubject(
  templateFromCube: string | null | undefined,
  vars: Record<string, string>,
  fallback: () => string,
): string {
  const t = templateFromCube?.trim();
  if (!t) return fallback();
  return interpolateEmailSubject(t, vars);
}
