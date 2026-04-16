import { describe, expect, it } from "vitest";
import { markdownEmailBodyToHtml } from "./emailBodyMarkdown";

describe("markdownEmailBodyToHtml", () => {
  it("wraps paragraphs with inline styles", () => {
    const html = markdownEmailBodyToHtml("Hello **world**.");
    expect(html).toContain('style="margin:0 0 8px 0');
    expect(html).toContain("<strong");
    expect(html).toContain("world");
  });

  it("converts markdown with inline emphasis", () => {
    const html = markdownEmailBodyToHtml("Line **one**.");
    expect(html).toContain("<strong");
    expect(html).toContain("one");
  });
});
