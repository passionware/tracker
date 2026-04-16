import { describe, expect, it } from "vitest";
import {
  DEFAULT_EMAIL_SUBJECT_TEMPLATE_INVOICE,
  emailSubjectInterpolationVars,
  interpolateEmailSubject,
  readEmailSubjectTemplateInvoiceFromCubeData,
  readEmailSubjectTemplateReminderFromCubeData,
  resolveInvoiceEmailSubject,
  resolveReminderEmailSubject,
} from "./emailSubjectTemplate";

const vars = emailSubjectInterpolationVars({
  from: "Jan 1",
  to: "Jan 31",
  workspaceName: "Acme",
  clientName: "Contoso",
  dueDate: "Feb 15",
});

describe("interpolateEmailSubject", () => {
  it("replaces known placeholders", () => {
    expect(
      interpolateEmailSubject("{{workspaceName}} — {{period}}", vars),
    ).toBe("Acme — Jan 1 to Jan 31");
  });

  it("leaves unknown placeholders unchanged", () => {
    expect(interpolateEmailSubject("{{unknown}} ok", vars)).toBe("{{unknown}} ok");
  });
});

describe("resolveInvoiceEmailSubject", () => {
  it("uses default template when cube value is empty", () => {
    expect(resolveInvoiceEmailSubject(null, vars)).toBe(
      interpolateEmailSubject(DEFAULT_EMAIL_SUBJECT_TEMPLATE_INVOICE, vars),
    );
  });
});

describe("resolveReminderEmailSubject", () => {
  it("uses fallback when template missing", () => {
    expect(
      resolveReminderEmailSubject(null, vars, () => "fallback"),
    ).toBe("fallback");
  });

  it("interpolates custom template", () => {
    expect(
      resolveReminderEmailSubject("Due {{dueDate}}", vars, () => "no"),
    ).toBe("Due Feb 15");
  });
});

describe("read from cube meta", () => {
  it("reads invoice template from meta.source", () => {
    expect(
      readEmailSubjectTemplateInvoiceFromCubeData({
        meta: { source: { emailSubjectTemplateInvoice: "  Hi  " } },
      }),
    ).toBe("Hi");
  });

  it("reads reminder template", () => {
    expect(
      readEmailSubjectTemplateReminderFromCubeData({
        meta: { source: { emailSubjectTemplateReminder: "R" } },
      }),
    ).toBe("R");
  });
});
