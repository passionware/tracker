export interface TimelineViewPreferences {
  viewMode: "timeline" | "table" | "both";
  darkMode: boolean;
  splitRatio: number; // Percentage for timeline panel (0-100)
  groupBy: "contractor" | "client" | "workspace" | "projectIteration";
  colorBy: "group" | "billing-status" | "cost-status";
}

/** Stored state for "last budget log sync" (skip auto-sync if recent and same iterations). */
export interface BudgetLogSyncState {
  lastSyncAt: number;
  iterationIds: number[];
}

/** Preferences for bulk create cost drawer (e.g. payment deduction % for Umowa o dzieło). */
export interface BulkCreateCostPreferences {
  paymentDeductionPercent: number;
  /** VAT % used to derive gross from net (default 23). */
  vatPercent: number;
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
  getBulkCreateCostPreferences: () => Promise<BulkCreateCostPreferences>;
  setBulkCreateCostPreferences: (
    preferences: Partial<BulkCreateCostPreferences>,
  ) => Promise<void>;
  useBulkCreateCostPreferences: () => BulkCreateCostPreferences;
}

export interface WithPreferenceService {
  preferenceService: PreferenceService;
}
