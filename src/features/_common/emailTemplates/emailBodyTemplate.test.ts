import { describe, expect, it } from "vitest";
import {
  buildReminderPaymentParagraphHtml,
  escapeHtml,
  resolveReminderEmailBodyHtml,
  reminderBodyInterpolationVars,
} from "./emailBodyTemplate";

describe("escapeHtml", () => {
  it("escapes ampersand and tags", () => {
    expect(escapeHtml(`a <b> & " '`)).toBe(
      "a &lt;b&gt; &amp; &quot; &#39;",
    );
  });
});

describe("buildReminderPaymentParagraphHtml", () => {
  it("wraps due date in strong", () => {
    const html = buildReminderPaymentParagraphHtml("30.04.2026", "in 14 days");
    expect(html).toContain("<strong>in 14 days</strong>");
    expect(html).toContain("30.04.2026");
  });
});

describe("resolveReminderEmailBodyHtml", () => {
  it("uses built-in default when cube template is empty", () => {
    const vars = reminderBodyInterpolationVars({
      periodFrom: "01.04.2026",
      periodTo: "15.04.2026",
      workspaceName: "W",
      clientName: "C",
      paymentParagraphHtml:
        "<p style=\"margin:0 0 8px 0\">We would be happy…</p>",
    });
    const html = resolveReminderEmailBodyHtml(null, vars);
    expect(html).toContain("01.04.2026 to 15.04.2026");
    expect(html).toContain("gentle reminder");
    expect(html).toContain("hesitate to reply");
  });

  it("preserves strong tags from template while substituting placeholders", () => {
    const vars = reminderBodyInterpolationVars({
      periodFrom: "01.04.2026",
      periodTo: "15.04.2026",
      workspaceName: "Acme",
      clientName: "Contoso",
      paymentParagraphHtml:
        "<p style=\"margin:0\">We would be happy… <strong>in 14 days</strong>.</p>",
    });
    const html = resolveReminderEmailBodyHtml(
      `<p>Hello</p><strong>{{period_from}} – {{period_to}}</strong>{{payment_paragraph_html}}<p>Otherwise confirm.</p>`,
      vars,
    );
    expect(html).toContain("01.04.2026 – 15.04.2026");
    expect(html).toContain("Otherwise confirm.");
    expect(html).toContain("in 14 days");
  });
});
