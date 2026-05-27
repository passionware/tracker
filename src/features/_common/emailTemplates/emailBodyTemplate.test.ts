import { describe, expect, it } from "vitest";
import {
  buildReminderPaymentParagraphHtml,
  escapeHtml,
  resolveReminderEmailBodyHtml,
  reminderBodyInterpolationVars,
  shouldSuggestAdvanceWireForDueDate,
} from "./emailBodyTemplate";

describe("escapeHtml", () => {
  it("escapes ampersand and tags", () => {
    expect(escapeHtml(`a <b> & " '`)).toBe(
      "a &lt;b&gt; &amp; &quot; &#39;",
    );
  });
});

describe("shouldSuggestAdvanceWireForDueDate", () => {
  it("is true for Saturday, Sunday, and Monday", () => {
    expect(shouldSuggestAdvanceWireForDueDate(new Date(2026, 3, 4))).toBe(true); // Sat
    expect(shouldSuggestAdvanceWireForDueDate(new Date(2026, 3, 5))).toBe(true); // Sun
    expect(shouldSuggestAdvanceWireForDueDate(new Date(2026, 3, 6))).toBe(true); // Mon
  });

  it("is false on a weekday other than Monday", () => {
    expect(shouldSuggestAdvanceWireForDueDate(new Date(2026, 3, 7))).toBe(false); // Tue
    expect(shouldSuggestAdvanceWireForDueDate(new Date(2026, 3, 9))).toBe(false); // Thu
  });
});

describe("buildReminderPaymentParagraphHtml", () => {
  it("wraps due date in strong", () => {
    const html = buildReminderPaymentParagraphHtml("30.04.2026", "in 14 days");
    expect(html).toContain("<strong>in 14 days</strong>");
    expect(html).toContain("30.04.2026");
  });

  it("asks to wire by Thursday when due on Saturday", () => {
    const html = buildReminderPaymentParagraphHtml(
      "04.04.2026",
      "in 3 days",
      new Date(2026, 3, 4),
    );
    expect(html).toContain("on a Saturday");
    expect(html).toContain("by Thursday");
    expect(html).not.toContain("by Friday");
  });

  it("asks to wire by Thursday when due on Sunday", () => {
    const html = buildReminderPaymentParagraphHtml(
      "05.04.2026",
      "in 4 days",
      new Date(2026, 3, 5),
    );
    expect(html).toContain("on a Sunday");
    expect(html).toContain("by Thursday");
  });

  it("asks to wire by Friday when due on Monday", () => {
    const html = buildReminderPaymentParagraphHtml(
      "06.04.2026",
      "in 3 days",
      new Date(2026, 3, 6),
    );
    expect(html).toContain("on a Monday");
    expect(html).toContain("by Friday");
    expect(html).not.toContain("by Thursday");
  });

  it("omits advance-wire note on a regular weekday", () => {
    const html = buildReminderPaymentParagraphHtml(
      "08.04.2026",
      "in 5 days",
      new Date(2026, 3, 8),
    );
    expect(html).not.toContain("by Thursday");
    expect(html).not.toContain("by Friday");
  });

  it("omits advance-wire note when payment is overdue", () => {
    const html = buildReminderPaymentParagraphHtml(
      "06.04.2026",
      "overdue",
      new Date(2026, 3, 6),
    );
    expect(html).not.toContain("on a Monday");
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
