import { Marked, Renderer, type RendererObject, type Tokens } from "marked";

const P =
  "margin:0 0 8px 0;line-height:1.55;color:#0f172a;font-size:14px;font-family:inherit";
const STRONG = "font-weight:600";
const A = "color:#2563eb;text-decoration:none;font-weight:600";
const UL_OL = "margin:0 0 8px 0;padding-left:1.25rem";
const LI = "margin:2px 0";
const H1 =
  "font-size:19px;font-weight:700;margin:0 0 10px 0;letter-spacing:-0.02em;color:#0f172a";
const H2 = "font-size:17px;font-weight:700;margin:0 0 8px 0;color:#0f172a";
const H3 = "font-size:15px;font-weight:600;margin:0 0 8px 0;color:#0f172a";
const BLOCKQUOTE =
  "border-left:3px solid #e2e8f0;padding-left:12px;margin:0 0 8px 0;color:#64748b";
const PRE =
  "margin:0 0 8px 0;padding:10px 12px;border-radius:8px;background:#f1f5f9;font-size:12px;overflow-x:auto";
const CODE = "font-family:ui-monospace,monospace;font-size:12px";
const HR = "border:0;border-top:1px solid #e2e8f0;margin:12px 0";

function headingStyle(depth: number): string {
  if (depth <= 1) return H1;
  if (depth === 2) return H2;
  return H3;
}

/**
 * Partial renderer: Gmail-friendly inline styles on tokens marked already emits.
 * Kept isolated in a dedicated {@link Marked} instance so global `marked` defaults stay untouched.
 */
const emailBodyRenderer: RendererObject = {
  paragraph({ tokens }: Tokens.Paragraph) {
    return `<p style="${P}">${this.parser.parseInline(tokens)}</p>\n`;
  },
  heading({ tokens, depth }: Tokens.Heading) {
    const style = headingStyle(depth);
    return `<h${depth} style="${style}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
  },
  blockquote({ tokens }: Tokens.Blockquote) {
    const body = this.parser.parse(tokens);
    return `<blockquote style="${BLOCKQUOTE}">\n${body}</blockquote>\n`;
  },
  hr(_token: Tokens.Hr) {
    return `<hr style="${HR}">\n`;
  },
  list(token: Tokens.List) {
    const raw = Renderer.prototype.list.call(this, token) as string;
    return raw.replace(
      /^<(ul|ol)([^>]*)>\n/,
      `<$1 style="${UL_OL}"$2>\n`,
    );
  },
  listitem(item: Tokens.ListItem) {
    const raw = Renderer.prototype.listitem.call(this, item) as string;
    return raw.replace("<li>", `<li style="${LI}">`);
  },
  code(token: Tokens.Code) {
    const raw = Renderer.prototype.code.call(this, token) as string;
    return raw
      .replace("<pre>", `<pre style="${PRE}">`)
      .replace("<code", `<code style="${CODE}"`);
  },
  strong({ tokens }: Tokens.Strong) {
    return `<strong style="${STRONG}">${this.parser.parseInline(tokens)}</strong>`;
  },
  em({ tokens }: Tokens.Em) {
    return `<em style="font-style:italic">${this.parser.parseInline(tokens)}</em>`;
  },
  codespan(token: Tokens.Codespan) {
    const raw = Renderer.prototype.codespan.call(this, token) as string;
    return raw.replace("<code", `<code style="${CODE}"`);
  },
  link(token: Tokens.Link) {
    const raw = Renderer.prototype.link.call(this, token) as string;
    if (!raw.startsWith("<a ")) {
      return raw;
    }
    return raw.replace("<a ", `<a style="${A}" `);
  },
};

const emailBodyMarkdownMarked = new Marked({
  async: false,
  breaks: true,
  gfm: true,
  renderer: emailBodyRenderer,
});

/**
 * Markdown → HTML with Gmail-friendly inline styles on common tags (via `marked` renderer).
 * Caller interpolates `{{placeholders}}` before this step when needed.
 */
export function markdownEmailBodyToHtml(markdown: string): string {
  const raw = markdown.trim();
  if (!raw) return "";
  return emailBodyMarkdownMarked.parse(raw, { async: false }) as string;
}
