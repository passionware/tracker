/**
 * Cockpit Schema Resolver
 * Automatically prefixes table names with the correct schema based on VITE_APP_COCKPIT_DB_SCHEMA
 */

export function getCockpitSchema(): string {
  const schema = import.meta.env.VITE_APP_COCKPIT_DB_SCHEMA || "client_cockpit";
  return schema;
}

/**
 * Utility to build fully qualified table names with cockpit schema
 * @example cockpitTable("cube_reports") => "client_cockpit.cube_reports"
 */
export function cockpitTable(tableName: string): string {
  return `${getCockpitSchema()}.${tableName}`;
}
