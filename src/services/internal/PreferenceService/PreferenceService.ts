export interface TimelineViewPreferences {
  viewMode: "timeline" | "table" | "both";
  darkMode: boolean;
  splitRatio: number; // Percentage for timeline panel (0-100)
  groupBy: "contractor" | "client" | "workspace" | "projectIteration";
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
}

export interface WithPreferenceService {
  preferenceService: PreferenceService;
}
