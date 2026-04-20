import type { TimeRole } from "@/api/time-role/time-role.api";
import { z } from "zod";

export const timeRole$ = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["contractor_self", "project_admin", "super_admin"]),
  scope_project_id: z.number().nullable(),
  granted_at: z.coerce.date(),
  granted_by: z.string().uuid().nullable(),
});
export type TimeRole$ = z.infer<typeof timeRole$>;

export function timeRoleFromHttp(row: TimeRole$): TimeRole {
  return {
    userId: row.user_id,
    role: row.role,
    scopeProjectId: row.scope_project_id,
    grantedAt: row.granted_at,
    grantedBy: row.granted_by,
  };
}
