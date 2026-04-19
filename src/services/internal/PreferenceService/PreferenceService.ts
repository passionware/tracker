export interface TimelineViewPreferences {
  viewMode: "timeline" | "table" | "both";
  darkMode: boolean;
  splitRatio: number; // Percentage for timeline panel (0-100)
  groupBy: "contractor" | "client" | "workspace" | "projectIteration";
  colorBy: "group" | "billing-status" | "cost-status";
}

/** Timeline bar / list row coloring on the client invoices page. */
export type BillingTimelineColorBy =
  | "group"
  | "linking-status"
  | "payment-status";

export interface BillingTimelineViewPreferences {
  colorBy: BillingTimelineColorBy;
}

export interface TimelineRangeShadingState {
  night: boolean;
  weekend: boolean;
}

/** Lane label column for TMetric live contractors timeline (popover / sheet). */
export type TmetricLiveLaneLegendMode = "full" | "dots";

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

/** Persisted app sidebar: which top-level nav sections stay expanded (by section title). */
export interface AppSidebarNavExpansion {
  initialized: boolean;
  expandedSectionTitles: readonly string[];
  setSectionExpanded: (
    sectionTitle: string,
    expanded: boolean,
  ) => Promise<void>;
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
  useBillingTimelineView: () => BillingTimelineViewPreferences;
  getBillingTimelineView: () => Promise<BillingTimelineViewPreferences>;
  setBillingTimelineView: (
    preferences: Partial<BillingTimelineViewPreferences>,
  ) => Promise<void>;
  useTimelineRangeShading: (
    scopeKey: string,
    defaults?: TimelineRangeShadingState,
  ) => TimelineRangeShadingState;
  getTimelineRangeShading: (
    scopeKey: string,
  ) => Promise<TimelineRangeShadingState | null>;
  setTimelineRangeShading: (
    scopeKey: string,
    preferences: Partial<TimelineRangeShadingState>,
  ) => Promise<void>;
  getBudgetLogSyncState: () => Promise<BudgetLogSyncState | null>;
  setBudgetLogSyncState: (state: BudgetLogSyncState) => Promise<void>;
  getBulkCreateCostPreferences: () => Promise<BulkCreateCostPreferences>;
  setBulkCreateCostPreferences: (
    preferences: Partial<BulkCreateCostPreferences>,
  ) => Promise<void>;
  useBulkCreateCostPreferences: () => BulkCreateCostPreferences;
  useAppSidebarNavExpansion: () => AppSidebarNavExpansion;
  /**
   * Last project chosen when creating an iteration, keyed by `workspaceId:clientId`
   * (`"all"` for unspecific route scope). Used to preselect the project picker.
   */
  getLastProjectForNewIteration: (scopeKey: string) => Promise<number | null>;
  setLastProjectForNewIteration: (
    scopeKey: string,
    projectId: number,
  ) => Promise<void>;
  /**
   * Last successful TMetric live contractors panel row count (persisted).
   * Used so loading skeletons match the previous list height and avoid layout jump.
   */
  useTmetricLiveContractorsPanelLastRowCount: () => number | null;
  recordTmetricLiveContractorsPanelLastRowCount: (
    rowCount: number,
  ) => Promise<void>;
  useTmetricLiveContractorsLaneLegendMode: () => TmetricLiveLaneLegendMode;
  setTmetricLiveContractorsLaneLegendMode: (
    mode: TmetricLiveLaneLegendMode,
  ) => Promise<void>;
  /**
   * Lane legend for the TMetric live panel in compact (e.g. full-screen mobile) layout.
   * Defaults to `"dots"`; independent from the desktop/popover preference.
   */
  useTmetricLiveContractorsLaneLegendModeCompact: () => TmetricLiveLaneLegendMode;
  setTmetricLiveContractorsLaneLegendModeCompact: (
    mode: TmetricLiveLaneLegendMode,
  ) => Promise<void>;
}

export interface WithPreferenceService {
  preferenceService: PreferenceService;
}
