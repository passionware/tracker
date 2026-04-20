import type {
  ExternalLink,
  ExternalLinkProvider,
} from "@/api/time-event/project-event.schema.ts";

/**
 * Best-effort parse of an external URL into the `{ provider, externalId }`
 * tuple the {@link ExternalLink} schema expects.
 *
 * Keeps the UI friendly: a teammate can paste a Linear / GitLab / GitHub /
 * Bitbucket / Jira link and the editor fills the provider + id for them.
 * Anything we can't classify falls back to `{ provider: "other" }` so the
 * link can still be saved verbatim — parsing is for convenience, not
 * validation. Schema-level validation still happens in the worker.
 *
 * Returns `null` when the input isn't a valid URL at all.
 */
export function parseExternalLinkUrl(
  raw: string,
): Pick<ExternalLink, "provider" | "externalId" | "url" | "label"> | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  const canonicalUrl = url.toString();

  // Linear: linear.app/<team>/issue/<TEAM-123>/<slug>
  if (host === "linear.app") {
    const issue = extractSegmentAfter(url.pathname, "issue");
    if (issue) {
      return {
        provider: "linear",
        externalId: issue.toUpperCase(),
        url: canonicalUrl,
        label: issue.toUpperCase(),
      };
    }
  }

  // GitHub: github.com/<owner>/<repo>/{issues,pull}/<n>
  //         github.com/<owner>/<repo>/tree/<branch>
  if (host === "github.com" || host.endsWith(".github.com")) {
    const match = url.pathname.match(
      /^\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)/,
    );
    if (match) {
      const [, owner, repo, kind, n] = match;
      const sigil = kind === "pull" ? "PR" : "#";
      return {
        provider: "github",
        externalId: `${owner}/${repo}${sigil}${n}`,
        url: canonicalUrl,
        label: `${repo}${sigil}${n}`,
      };
    }
    const branch = url.pathname.match(/^\/([^/]+)\/([^/]+)\/tree\/(.+)$/);
    if (branch) {
      const [, , repo, ref] = branch;
      return {
        provider: "github",
        externalId: `${repo}@${decodeURIComponent(ref)}`,
        url: canonicalUrl,
        label: decodeURIComponent(ref),
      };
    }
  }

  // GitLab (cloud + self-hosted): .../<group>/<project>/-/{issues,merge_requests}/<n>
  //                               .../<group>/<project>/-/tree/<branch>
  if (host === "gitlab.com" || host.includes("gitlab")) {
    const issue = url.pathname.match(
      /\/-\/(issues|merge_requests)\/(\d+)(?:\/|$)/,
    );
    if (issue) {
      const [, kind, n] = issue;
      const sigil = kind === "merge_requests" ? "!" : "#";
      const proj = url.pathname.split("/-/")[0].split("/").filter(Boolean).pop();
      return {
        provider: "gitlab",
        externalId: `${proj ?? "gitlab"}${sigil}${n}`,
        url: canonicalUrl,
        label: `${proj ?? "gitlab"}${sigil}${n}`,
      };
    }
    const branch = url.pathname.match(/\/-\/tree\/(.+?)(?:\/|$)/);
    if (branch) {
      const ref = decodeURIComponent(branch[1]);
      const proj = url.pathname.split("/-/")[0].split("/").filter(Boolean).pop();
      return {
        provider: "gitlab",
        externalId: `${proj ?? "gitlab"}@${ref}`,
        url: canonicalUrl,
        label: ref,
      };
    }
  }

  // Bitbucket: bitbucket.org/<workspace>/<repo>/{pull-requests,issues}/<n>
  //            bitbucket.org/<workspace>/<repo>/branch/<branch>
  if (host === "bitbucket.org") {
    const match = url.pathname.match(
      /^\/([^/]+)\/([^/]+)\/(pull-requests|issues)\/(\d+)/,
    );
    if (match) {
      const [, , repo, kind, n] = match;
      const sigil = kind === "pull-requests" ? "!" : "#";
      return {
        provider: "bitbucket",
        externalId: `${repo}${sigil}${n}`,
        url: canonicalUrl,
        label: `${repo}${sigil}${n}`,
      };
    }
    const branch = url.pathname.match(/^\/([^/]+)\/([^/]+)\/branch\/(.+)$/);
    if (branch) {
      const [, , repo, ref] = branch;
      return {
        provider: "bitbucket",
        externalId: `${repo}@${decodeURIComponent(ref)}`,
        url: canonicalUrl,
        label: decodeURIComponent(ref),
      };
    }
  }

  // Jira: *.atlassian.net/browse/<PROJECT-123> (also Jira Cloud newer /jira/...)
  if (host.endsWith(".atlassian.net")) {
    const browse = url.pathname.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/i);
    if (browse) {
      const key = browse[1].toUpperCase();
      return {
        provider: "jira",
        externalId: key,
        url: canonicalUrl,
        label: key,
      };
    }
  }

  // Unrecognised — still a valid link; caller chooses whether to use `other`
  // or keep the user's manual pick.
  return {
    provider: "other",
    externalId: url.hostname + url.pathname,
    url: canonicalUrl,
    label: undefined,
  };
}

/** Walks `/a/b/<segment>/x/y` and returns the token right after `segment`. */
function extractSegmentAfter(pathname: string, segment: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.indexOf(segment);
  if (idx === -1) return null;
  return parts[idx + 1] ?? null;
}

/** True when `a` and `b` refer to the same link (by provider + externalId). */
export function sameExternalLink(a: ExternalLink, b: ExternalLink): boolean {
  return a.provider === b.provider && a.externalId === b.externalId;
}

/** Stable key for React lists / Set members. */
export function externalLinkKey(link: {
  provider: ExternalLinkProvider;
  externalId: string;
}): string {
  return `${link.provider}:${link.externalId}`;
}
