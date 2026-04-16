import { describe, expect, it } from "vitest";
import {
  parseReportDefaults,
  serializeReportDefaultsForRpc,
} from "./reportDefaults.schema";

describe("parseReportDefaults", () => {
  it("maps nested snake_case JSON to domain", () => {
    expect(
      parseReportDefaults({
        invoice_email: {
          title_template: "T1",
          body_markdown_template: "**Hi**",
        },
        reminder_email: {
          title_template: "T2",
          body_markdown_template: "## Rem",
        },
      }),
    ).toEqual({
      invoiceEmail: { titleTemplate: "T1", bodyMarkdownTemplate: "**Hi**" },
      reminderEmail: { titleTemplate: "T2", bodyMarkdownTemplate: "## Rem" },
    });
  });

  it("ignores deprecated body_html_template in stored JSON", () => {
    expect(
      parseReportDefaults({
        invoice_email: {
          title_template: "T",
          body_html_template: "<p>Old</p>",
        },
      }),
    ).toEqual({
      invoiceEmail: { titleTemplate: "T" },
    });
  });
});

describe("serializeReportDefaultsForRpc", () => {
  it("emits title and body_markdown_template only", () => {
    const s = serializeReportDefaultsForRpc({
      invoiceEmail: { titleTemplate: "A", bodyMarkdownTemplate: "# Title" },
      reminderEmail: { titleTemplate: "B", bodyMarkdownTemplate: "" },
    });
    expect(s).toEqual({
      invoice_email: {
        title_template: "A",
        body_markdown_template: "# Title",
      },
      reminder_email: {
        title_template: "B",
        body_markdown_template: null,
      },
    });
  });
});
