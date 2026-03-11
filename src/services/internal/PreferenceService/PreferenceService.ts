export interface TimelineViewPreferences {
  viewMode: "timeline" | "table" | "both";
  darkMode: boolean;
  splitRatio: number; // Percentage for timeline panel (0-100)
  groupBy: "contractor" | "client" | "workspace" | "projectIteration";
}

/** Stored state for "last budget log sync" (skip auto-sync if recent and same iterations). */
export interface BudgetLogSyncState {
  lastSyncAt: number;
  iterationIds: number[];
}

export interface PreferenceService {
  useIsDangerMode: () => boolean;
  getIsDangerMode: () => boolean;
  setIsDangerMode: (value: boolean) => void;
  useTimelineView: () => TimelineViewPreferences;
  getTimelineView: () => Promise<TimelineViewPreferences>;
  setTimelineView: (
    preferences: Partial<TimelineViewPreferences>,
  ) => Promise<void>;
  getBudgetLogSyncState: () => Promise<BudgetLogSyncState | null>;
  setBudgetLogSyncState: (state: BudgetLogSyncState) => Promise<void>;
}

export interface WithPreferenceService {
  preferenceService: PreferenceService;
}
