/**
 * Main App Schema Resolver
 * Automatically prefixes table names with the correct schema based on VITE_APP_MAIN_DB_SCHEMA
 */

export function getMainSchema(): string {
  const schema = import.meta.env.VITE_APP_MAIN_DB_SCHEMA || "public";
  return schema;
}

/**
 * Utility to build fully qualified table names with main app schema
 * @example mainTable("projects") => "public.projects"
 */
export function mainTable(tableName: string): string {
  return `${getMainSchema()}.${tableName}`;
}
