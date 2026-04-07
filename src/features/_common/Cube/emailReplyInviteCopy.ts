/** Full closing paragraph in the invoice email (custom text replaces this whole block). */
export const DEFAULT_EMAIL_REPLY_INVITE_INVOICE =
  "If anything needs clarification, reply to this email. Otherwise, please confirm so we can issue the invoice(s).";

/** Closing paragraph in the reminder email. */
export const DEFAULT_EMAIL_REPLY_INVITE_REMINDER =
  "If you need any clarification or have questions, please don't hesitate to reply to this email. We're here to help.";

/**
 * Reads optional copy embedded at publish time (`cube_data.meta.source.emailReplyInviteMessage`).
 */
export function readEmailReplyInviteMessageFromCubeData(
  cubeData: Record<string, unknown>,
): string | null {
  const meta = cubeData.meta;
  if (!meta || typeof meta !== "object") return null;
  const source = (meta as Record<string, unknown>).source;
  if (!source || typeof source !== "object") return null;
  const raw = (source as Record<string, unknown>).emailReplyInviteMessage;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return t.length > 0 ? t : null;
}
