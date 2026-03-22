/**
 * Expected production Postgres schemas (Supabase `db.schema`), aligned with
 * `VITE_APP_MAIN_DB_SCHEMA` / `VITE_APP_COCKPIT_DB_SCHEMA`.
 */
export const MAIN_APP_PRODUCTION_DB_SCHEMA = "public";
export const CLIENT_COCKPIT_PRODUCTION_DB_SCHEMA = "client_cockpit";

const mainSchema = String(import.meta.env.VITE_APP_MAIN_DB_SCHEMA ?? "");
const cockpitSchema = String(import.meta.env.VITE_APP_COCKPIT_DB_SCHEMA ?? "");

export const mainAppUsesDevDatabase =
  mainSchema.length > 0 && mainSchema !== MAIN_APP_PRODUCTION_DB_SCHEMA;

export const cockpitUsesDevDatabase =
  cockpitSchema.length > 0 &&
  cockpitSchema !== CLIENT_COCKPIT_PRODUCTION_DB_SCHEMA;

export type DevDatabaseSidebarLine = { label: string; schema: string };

export function getDevDatabaseSidebarLines(): DevDatabaseSidebarLine[] {
  const lines: DevDatabaseSidebarLine[] = [];
  if (mainAppUsesDevDatabase) {
    lines.push({ label: "Main app", schema: mainSchema });
  }
  if (cockpitUsesDevDatabase) {
    lines.push({ label: "Cockpit", schema: cockpitSchema });
  }
  return lines;
}
