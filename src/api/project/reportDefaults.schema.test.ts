import { describe, expect, it } from "vitest";
import {
  parseReportDefaults,
  serializeReportDefaultsForRpc,
} from "./reportDefaults.schema";

describe("parseReportDefaults", () => {
  it("maps snake_case JSON to domain", () => {
    expect(
      parseReportDefaults({
        email_reply_invite_message: "Hi",
        invoice_email: { title_template: "T1" },
        reminder_email: { title_template: "T2" },
      }),
    ).toEqual({
      emailReplyInviteMessage: "Hi",
      invoiceEmail: { titleTemplate: "T1" },
      reminderEmail: { titleTemplate: "T2" },
    });
  });
});

describe("serializeReportDefaultsForRpc", () => {
  it("round-trips clearing fields as null", () => {
    const s = serializeReportDefaultsForRpc({
      emailReplyInviteMessage: "",
      invoiceEmail: { titleTemplate: "" },
      reminderEmail: { titleTemplate: "" },
    });
    expect(s.email_reply_invite_message).toBeNull();
    expect((s.invoice_email as { title_template: unknown }).title_template).toBe(
      null,
    );
  });
});
