/**
 * Postgres schema names from Vite env (`VITE_APP_MAIN_DB_SCHEMA`,
 * `VITE_APP_COCKPIT_DB_SCHEMA`, `VITE_APP_TIME_DB_SCHEMA`). Main and cockpit
 * surfaces treat the literal schema `public` as the shared “public /
 * production” schema for banner purposes; the time-tracking schema is always
 * environment-specific (`time_dev` / `time_prod`) and is shown as soon as the
 * env var is set.
 */

/** Schema name considered “public” for main app and cockpit (banner hides when both match on non-localhost). */
export const PUBLIC_DB_SCHEMA = "public";

/** Default time schema when `VITE_APP_TIME_DB_SCHEMA` is missing — matches `timeSupabase.connected.ts`. */
const DEFAULT_TIME_SCHEMA = "time_dev";

const mainSchemaRaw = String(import.meta.env.VITE_APP_MAIN_DB_SCHEMA ?? "");
const cockpitSchemaRaw = String(import.meta.env.VITE_APP_COCKPIT_DB_SCHEMA ?? "");
const timeSchemaRaw = String(import.meta.env.VITE_APP_TIME_DB_SCHEMA ?? "");

function normalizedSchema(raw: string, fallback: string = PUBLIC_DB_SCHEMA): string {
  const t = raw.trim();
  return t.length > 0 ? t : fallback;
}

export function isLocalhostHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost")
  );
}

export type DevDatabaseSidebarLine = { label: string; schema: string };

export function getDevDatabaseSidebarLines(options?: {
  isLocalhost?: boolean;
}): DevDatabaseSidebarLine[] {
  const isLocalhost = options?.isLocalhost ?? false;
  const main = normalizedSchema(mainSchemaRaw);
  const cockpit = normalizedSchema(cockpitSchemaRaw);
  const time = normalizedSchema(timeSchemaRaw, DEFAULT_TIME_SCHEMA);

  if (isLocalhost) {
    return [
      { label: "Main app", schema: main },
      { label: "Cockpit", schema: cockpit },
      { label: "Time", schema: time },
    ];
  }

  const lines: DevDatabaseSidebarLine[] = [];
  if (main !== PUBLIC_DB_SCHEMA) {
    lines.push({ label: "Main app", schema: main });
  }
  if (cockpit !== PUBLIC_DB_SCHEMA) {
    lines.push({ label: "Cockpit", schema: cockpit });
  }
  // The time schema is always non-public; surface it whenever it differs from
  // the prod default so reviewers can see they're pointed at time_dev.
  if (time !== "time_prod") {
    lines.push({ label: "Time", schema: time });
  }
  return lines;
}
