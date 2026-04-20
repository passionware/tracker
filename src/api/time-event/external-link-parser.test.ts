import { describe, expect, it } from "vitest";
import { parseExternalLinkUrl } from "./external-link-parser.ts";

describe("parseExternalLinkUrl", () => {
  it("returns null for empty / non-URL input", () => {
    expect(parseExternalLinkUrl("")).toBeNull();
    expect(parseExternalLinkUrl("   ")).toBeNull();
    expect(parseExternalLinkUrl("not-a-url")).toBeNull();
    expect(parseExternalLinkUrl("ftp://example.com/file")).toBeNull();
  });

  it("parses Linear issue URLs into provider + ENG-123 id", () => {
    const out = parseExternalLinkUrl(
      "https://linear.app/acme/issue/ENG-123/my-cool-ticket",
    );
    expect(out).toMatchObject({
      provider: "linear",
      externalId: "ENG-123",
      label: "ENG-123",
    });
    expect(out!.url).toBe(
      "https://linear.app/acme/issue/ENG-123/my-cool-ticket",
    );
  });

  it("parses GitHub issues, PRs and branch trees", () => {
    expect(
      parseExternalLinkUrl("https://github.com/org/repo/issues/42"),
    ).toMatchObject({
      provider: "github",
      externalId: "org/repo#42",
      label: "repo#42",
    });
    expect(
      parseExternalLinkUrl("https://github.com/org/repo/pull/99"),
    ).toMatchObject({
      provider: "github",
      externalId: "org/repoPR99",
      label: "repoPR99",
    });
    expect(
      parseExternalLinkUrl("https://github.com/org/repo/tree/feat%2Fnew-ui"),
    ).toMatchObject({
      provider: "github",
      externalId: "repo@feat/new-ui",
      label: "feat/new-ui",
    });
  });

  it("parses GitLab issues, MRs and branches including self-hosted hosts", () => {
    expect(
      parseExternalLinkUrl("https://gitlab.com/group/proj/-/merge_requests/7"),
    ).toMatchObject({
      provider: "gitlab",
      externalId: "proj!7",
    });
    expect(
      parseExternalLinkUrl("https://gitlab.com/group/proj/-/issues/12"),
    ).toMatchObject({
      provider: "gitlab",
      externalId: "proj#12",
    });
    expect(
      parseExternalLinkUrl(
        "https://gitlab.acme.corp/group/proj/-/tree/feature%2Fauth",
      ),
    ).toMatchObject({
      provider: "gitlab",
      externalId: "proj@feature/auth",
    });
  });

  it("parses Bitbucket pull-requests and branches", () => {
    expect(
      parseExternalLinkUrl(
        "https://bitbucket.org/ws/repo/pull-requests/4/fix-bug",
      ),
    ).toMatchObject({
      provider: "bitbucket",
      externalId: "repo!4",
    });
    expect(
      parseExternalLinkUrl("https://bitbucket.org/ws/repo/branch/feature/x"),
    ).toMatchObject({
      provider: "bitbucket",
      externalId: "repo@feature/x",
    });
  });

  it("parses Jira Cloud browse URLs", () => {
    expect(
      parseExternalLinkUrl("https://acme.atlassian.net/browse/ENG-7"),
    ).toMatchObject({
      provider: "jira",
      externalId: "ENG-7",
    });
  });

  it("falls back to `other` for unknown hosts but still returns the URL", () => {
    const out = parseExternalLinkUrl(
      "https://example.com/docs/thing?x=1#section",
    );
    expect(out).toMatchObject({
      provider: "other",
      externalId: "example.com/docs/thing",
    });
    expect(out!.url).toBe("https://example.com/docs/thing?x=1#section");
  });
});
