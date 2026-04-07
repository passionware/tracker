import { Workspace } from "@/api/workspace/workspace.api.ts";

/**
 * Build an absolute URL for a cockpit path. Optional `baseUrl` overrides the
 * origin; otherwise the current browser origin is used.
 */
export function buildCockpitAbsoluteUrl(
  baseUrl: string | null | undefined,
  path: string,
): string {
  const base = (baseUrl?.trim() || window.location.origin).replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

function pickMainTrackerWorkspaceRow(workspaces: Workspace[]): Workspace | null {
  const sorted = [...workspaces].sort((a, b) => a.id - b.id);
  const withLogo = sorted.find((w) => (w.avatarUrl ?? "").trim());
  return withLogo ?? sorted[0] ?? null;
}

/** Prefer a linked workspace that has a logo; otherwise first by id. */
export function pickMainTrackerWorkspaceLogoUrl(
  workspaces: Workspace[],
): string | null {
  const w = pickMainTrackerWorkspaceRow(workspaces);
  const url = w?.avatarUrl?.trim();
  return url || null;
}

/** Same workspace row as {@link pickMainTrackerWorkspaceLogoUrl} — for issuer display name. */
export function pickMainTrackerWorkspaceDisplayName(
  workspaces: Workspace[],
): string | null {
  const w = pickMainTrackerWorkspaceRow(workspaces);
  const name = w?.name?.trim();
  return name || null;
}
