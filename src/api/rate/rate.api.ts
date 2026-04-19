import type { Contractor } from "@/api/contractor/contractor.api";
import type { Project } from "@/api/project/project.api";
import type { RateSnapshot } from "@/api/time-event/time-event.api";
import { Nullable } from "@/platform/typescript/Nullable";

/**
 * One row in `rate_current` — the active rate for a given (project, contractor)
 * pair. The rate is snapshotted onto `entry.rate_*` columns on EntryStarted,
 * so this row exists primarily to drive the start-timer rate preview and the
 * RateManager admin UI.
 */
export interface ProjectRate {
  projectId: Project["id"];
  contractorId: Contractor["id"];
  /** Reuses the same nested shape as a time entry's rate snapshot. */
  rate: RateSnapshot;
  /** When this rate became effective. Earlier rates remain in event history. */
  effectiveFrom: Date;
  version: number;
  lastEventId: Nullable<string>;
  updatedAt: Date;
}

export interface ProjectRateApi {
  getCurrentRate: (
    projectId: Project["id"],
    contractorId: Contractor["id"],
  ) => Promise<Nullable<ProjectRate>>;
  /** Hot path for the project rate manager: every contractor's current rate. */
  getRatesForProject: (projectId: Project["id"]) => Promise<ProjectRate[]>;
  /** Hot path for the contractor profile: every project's current rate. */
  getRatesForContractor: (
    contractorId: Contractor["id"],
  ) => Promise<ProjectRate[]>;
}
