/**
 * Postgres schema names from Vite env (`VITE_APP_MAIN_DB_SCHEMA`,
 * `VITE_APP_COCKPIT_DB_SCHEMA`). Both app surfaces treat the literal schema
 * `public` as the shared “public / production” schema for banner purposes.
 */

/** Schema name considered “public” for main app and cockpit (banner hides when both match on non-localhost). */
export const PUBLIC_DB_SCHEMA = "public";

const mainSchemaRaw = String(import.meta.env.VITE_APP_MAIN_DB_SCHEMA ?? "");
const cockpitSchemaRaw = String(import.meta.env.VITE_APP_COCKPIT_DB_SCHEMA ?? "");

function normalizedSchema(raw: string): string {
  const t = raw.trim();
  return t.length > 0 ? t : PUBLIC_DB_SCHEMA;
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

  if (isLocalhost) {
    return [
      { label: "Main app", schema: main },
      { label: "Cockpit", schema: cockpit },
    ];
  }

  const lines: DevDatabaseSidebarLine[] = [];
  if (main !== PUBLIC_DB_SCHEMA) {
    lines.push({ label: "Main app", schema: main });
  }
  if (cockpit !== PUBLIC_DB_SCHEMA) {
    lines.push({ label: "Cockpit", schema: cockpit });
  }
  return lines;
}
