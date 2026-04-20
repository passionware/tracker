import type { Project } from "@/api/project/project.api";
import { Nullable } from "@/platform/typescript/Nullable";

/**
 * One row in `time_*.role` — a grant of (user, role, optional scope).
 *
 * Seeded by admin tooling (event-sourcing for the role table itself is on
 * the roadmap as a future `user_role` stream). The SPA reads this table
 * via PostgREST to answer "what can the current user do?".
 */
export type TimeRoleKind = "contractor_self" | "project_admin" | "super_admin";

export interface TimeRole {
  userId: string;
  role: TimeRoleKind;
  /**
   * `null` for global roles (`super_admin`, `contractor_self`); populated
   * for `project_admin`.
   */
  scopeProjectId: Nullable<Project["id"]>;
  grantedAt: Date;
  grantedBy: Nullable<string>;
}

export interface TimeRoleQuery {
  userId?: string;
  role?: TimeRoleKind | TimeRoleKind[];
  scopeProjectId?: Project["id"];
}

export interface TimeRoleApi {
  getRoles: (query: TimeRoleQuery) => Promise<TimeRole[]>;
}
