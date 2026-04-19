import type { Project } from "@/api/project/project.api";
import { Nullable } from "@/platform/typescript/Nullable";

/**
 * One row in `activity_current` — the most recent state of a project
 * activity (e.g. "Development", "Code review", "Jump-on").
 *
 * `kinds` is a free-form classification array used by the UI to specialize
 * behavior — most importantly, the activity row picker for the teammate
 * avatar quick-start filters on `kinds @> {"jump_on"}`.
 */
export interface Activity {
  id: string;
  projectId: Project["id"];
  name: string;
  description: Nullable<string>;
  kinds: string[];
  isArchived: boolean;
  version: number;
  lastEventId: Nullable<string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityQuery {
  projectId?: Project["id"];
  /** Filter by kind tag (e.g. `"jump_on"` for the jump-on quick row). */
  kind?: string;
  includeArchived?: boolean;
  limit?: number;
}

export interface ActivityApi {
  getActivities: (query: ActivityQuery) => Promise<Activity[]>;
  getActivity: (activityId: string) => Promise<Nullable<Activity>>;
}
