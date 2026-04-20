import {
  BillingTimelineViewPreferences,
  BudgetLogSyncState,
  BulkCreateCostPreferences,
  CustomDashboardKpi,
  PreferenceService,
  TimelineRangeShadingState,
  TimelineViewPreferences,
} from "@/services/internal/PreferenceService/PreferenceService.ts";
import { createLocalStorageApi } from "@/services/internal/PreferenceService/createLocalStorageApi.ts";
import { z } from "zod";
import { create } from "zustand";

const budgetLogSyncStateSchema = z.object({
  lastSyncAt: z.number(),
  iterationIds: z.array(z.number()),
});

const budgetLogSyncApi = createLocalStorageApi<BudgetLogSyncState | null>(
  "tmetric_budget_log_sync",
  (data) => {
    const result = budgetLogSyncStateSchema.safeParse(data);
    return result.success ? result.data : null;
  },
  null,
);

const bulkCreateCostPreferencesSchema = z.object({
  paymentDeductionPercent: z.number().min(0).max(100),
  vatPercent: z.number().min(0).max(100).optional(),
});

const defaultBulkCreateCostPreferences: BulkCreateCostPreferences = {
  paymentDeductionPercent: 0,
  vatPercent: 23,
};

const bulkCreateCostApi = createLocalStorageApi<BulkCreateCostPreferences>(
  "bulk-create-cost-preferences",
  (data) => {
    try {
      const parsed = bulkCreateCostPreferencesSchema.parse(data);
      return {
        ...defaultBulkCreateCostPreferences,
        ...parsed,
        vatPercent: parsed.vatPercent ?? defaultBulkCreateCostPreferences.vatPercent,
      };
    } catch {
      return defaultBulkCreateCostPreferences;
    }
  },
  defaultBulkCreateCostPreferences,
);

type Preferences = {
  dangerMode: boolean;
};
type Store = {
  preferences: Preferences;
  setPreference<K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ): void;
};

const timelineViewPreferencesSchema = z.object({
  viewMode: z.enum(["timeline", "table", "both"]),
  darkMode: z.boolean(),
  splitRatio: z.number().min(0).max(100),
  groupBy: z.enum(["contractor", "client", "workspace", "projectIteration"]),
  colorBy: z.enum(["group", "billing-status", "cost-status"]),
});

const defaultTimelineViewPreferences: TimelineViewPreferences = {
  viewMode: "both",
  darkMode: false,
  splitRatio: 40,
  groupBy: "contractor",
  colorBy: "billing-status",
};

const timelineViewApi = createLocalStorageApi<TimelineViewPreferences>(
  "timeline-view-preferences",
  (data) => {
    try {
      return timelineViewPreferencesSchema.parse(data);
    } catch {
      return defaultTimelineViewPreferences;
    }
  },
  defaultTimelineViewPreferences,
);

const billingTimelineViewPreferencesSchema = z.object({
  colorBy: z.enum(["group", "linking-status", "payment-status"]),
});

const defaultBillingTimelineViewPreferences: BillingTimelineViewPreferences = {
  colorBy: "payment-status",
};

const billingTimelineViewApi = createLocalStorageApi<BillingTimelineViewPreferences>(
  "billing-timeline-view-preferences",
  (data) => {
    try {
      return billingTimelineViewPreferencesSchema.parse(data);
    } catch {
      return defaultBillingTimelineViewPreferences;
    }
  },
  defaultBillingTimelineViewPreferences,
);

const timelineRangeShadingStateSchema = z.object({
  night: z.boolean(),
  weekend: z.boolean(),
});

const timelineRangeShadingMapSchema = z.record(
  z.string(),
  timelineRangeShadingStateSchema,
);

const timelineRangeShadingApi = createLocalStorageApi<
  Record<string, TimelineRangeShadingState>
>(
  "timeline-range-shading-preferences-v1",
  (data) => {
    const result = timelineRangeShadingMapSchema.safeParse(data);
    return result.success ? result.data : {};
  },
  {},
);

const appSidebarNavExpandedSectionsSchema = z.object({
  sectionTitles: z.array(z.string()),
});

type AppSidebarNavExpandedSectionsStored = z.infer<
  typeof appSidebarNavExpandedSectionsSchema
>;

const defaultAppSidebarNavExpandedSections: AppSidebarNavExpandedSectionsStored =
  {
    sectionTitles: [],
  };

const appSidebarNavExpandedSectionsApi =
  createLocalStorageApi<AppSidebarNavExpandedSectionsStored>(
    "app-sidebar-nav-expanded-sections",
    (data) => {
      const result = appSidebarNavExpandedSectionsSchema.safeParse(data);
      return result.success
        ? result.data
        : defaultAppSidebarNavExpandedSections;
    },
    defaultAppSidebarNavExpandedSections,
  );

const lastProjectForNewIterationSchema = z.record(
  z.string(),
  z.number().int().positive(),
);

const lastProjectForNewIterationApi = createLocalStorageApi<
  Record<string, number>
>(
  "last-project-for-new-iteration-v1",
  (data) => {
    const result = lastProjectForNewIterationSchema.safeParse(data);
    return result.success ? result.data : {};
  },
  {},
);

const tmetricLiveContractorsLastRowCountSchema = z
  .number()
  .int()
  .min(0)
  .max(500);

const tmetricLiveContractorsLastRowCountApi = createLocalStorageApi<
  number | null
>(
  "tmetric-live-contractors-panel-last-row-count-v1",
  (data) => {
    const result = tmetricLiveContractorsLastRowCountSchema.safeParse(data);
    return result.success ? result.data : null;
  },
  null,
);

const tmetricLiveLaneLegendModeSchema = z.enum(["full", "dots"]);

const tmetricLiveLaneLegendModeApi = createLocalStorageApi<
  "full" | "dots"
>(
  "tmetric-live-contractors-lane-legend-mode-v1",
  (data) => {
    const result = tmetricLiveLaneLegendModeSchema.safeParse(data);
    return result.success ? result.data : "full";
  },
  "full",
);

const tmetricLiveLaneLegendModeCompactApi = createLocalStorageApi<
  "full" | "dots"
>(
  "tmetric-live-contractors-lane-legend-compact-v1",
  (data) => {
    const result = tmetricLiveLaneLegendModeSchema.safeParse(data);
    return result.success ? result.data : "dots";
  },
  "dots",
);

const tmetricLivePageViewModeSchema = z.enum(["both", "timeline", "kpis"]);

const tmetricLivePageViewModeApi = createLocalStorageApi<
  "both" | "timeline" | "kpis"
>(
  "tmetric-live-page-view-mode-v1",
  (data) => {
    const result = tmetricLivePageViewModeSchema.safeParse(data);
    return result.success ? result.data : "both";
  },
  "both",
);

const customDashboardKpiSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  formula: z.string(),
  contractorIds: z.array(z.number()).optional(),
  display: z.enum(["currency", "number", "hours", "percent"]),
  baseCurrency: z.string().min(1),
});

const customDashboardKpisApi = createLocalStorageApi<CustomDashboardKpi[]>(
  "custom-dashboard-kpis-v1",
  (data) => {
    const result = z.array(customDashboardKpiSchema).safeParse(data);
    return result.success ? result.data : [];
  },
  [],
);

/**
 * Persisted "I'm tracking time as contractor X" identity used by the global
 * TrackerBar. Stored as a positive integer (matching `contractor.id`); any
 * other shape resets to `null` so a stale value can't keep the bar pinned to
 * an unknown contractor after a database swap.
 */
const trackerActiveContractorIdSchema = z.number().int().positive();

const trackerActiveContractorIdApi = createLocalStorageApi<number | null>(
  "tracker-active-contractor-id-v1",
  (data) => {
    const result = trackerActiveContractorIdSchema.safeParse(data);
    return result.success ? result.data : null;
  },
  null,
);

export function createPreferenceService(): PreferenceService {
  const usePreferences = create<Store>((set) => {
    return {
      preferences: {
        dangerMode: false,
      },
      setPreference<K extends keyof Preferences>(
        key: K,
        value: Preferences[K],
      ) {
        set((state) => ({
          preferences: {
            ...state.preferences,
            [key]: value,
          },
        }));
      },
    };
  });

  // Create a zustand store for timeline view preferences
  const useTimelineViewStore = create<{
    preferences: TimelineViewPreferences;
    setPreferences: (prefs: Partial<TimelineViewPreferences>) => Promise<void>;
    initialized: boolean;
  }>((set, get) => ({
    preferences: defaultTimelineViewPreferences,
    initialized: false,
    setPreferences: async (partialPrefs: Partial<TimelineViewPreferences>) => {
      const current = get().preferences;
      const newPrefs: TimelineViewPreferences = {
        ...current,
        ...partialPrefs,
      };
      set({ preferences: newPrefs });
      await timelineViewApi.write(newPrefs);
    },
  }));

  // Initialize from localStorage
  void timelineViewApi.read().then((prefs) => {
    if (prefs) {
      useTimelineViewStore.setState({
        preferences: prefs,
        initialized: true,
      });
    } else {
      useTimelineViewStore.setState({ initialized: true });
    }
  });

  const useBillingTimelineViewStore = create<{
    preferences: BillingTimelineViewPreferences;
    setPreferences: (
      prefs: Partial<BillingTimelineViewPreferences>,
    ) => Promise<void>;
    initialized: boolean;
  }>((set, get) => ({
    preferences: defaultBillingTimelineViewPreferences,
    initialized: false,
    setPreferences: async (partialPrefs) => {
      const current = get().preferences;
      const newPrefs: BillingTimelineViewPreferences = {
        ...current,
        ...partialPrefs,
      };
      set({ preferences: newPrefs });
      await billingTimelineViewApi.write(newPrefs);
    },
  }));

  void billingTimelineViewApi.read().then((prefs) => {
    if (prefs) {
      useBillingTimelineViewStore.setState({
        preferences: prefs,
        initialized: true,
      });
    } else {
      useBillingTimelineViewStore.setState({ initialized: true });
    }
  });

  const defaultTimelineRangeShadingState: TimelineRangeShadingState = {
    night: true,
    weekend: true,
  };
  const useTimelineRangeShadingStore = create<{
    preferencesByKey: Record<string, TimelineRangeShadingState>;
    initialized: boolean;
    setPreferences: (
      scopeKey: string,
      prefs: Partial<TimelineRangeShadingState>,
    ) => Promise<void>;
  }>((set, get) => ({
    preferencesByKey: {},
    initialized: false,
    setPreferences: async (scopeKey, partial) => {
      const current = get().preferencesByKey[scopeKey] ?? defaultTimelineRangeShadingState;
      const next: TimelineRangeShadingState = {
        ...current,
        ...partial,
      };
      const map = {
        ...get().preferencesByKey,
        [scopeKey]: next,
      };
      set({ preferencesByKey: map });
      await timelineRangeShadingApi.write(map);
    },
  }));

  void timelineRangeShadingApi.read().then((prefs) => {
    useTimelineRangeShadingStore.setState({
      preferencesByKey: prefs ?? {},
      initialized: true,
    });
  });

  const useBulkCreateCostStore = create<{
    preferences: BulkCreateCostPreferences;
    setPreferences: (
      partial: Partial<BulkCreateCostPreferences>,
    ) => Promise<void>;
    initialized: boolean;
  }>((set, get) => ({
    preferences: defaultBulkCreateCostPreferences,
    initialized: false,
    setPreferences: async (partial) => {
      const current = get().preferences;
      const next = { ...current, ...partial };
      set({ preferences: next });
      await bulkCreateCostApi.write(next);
    },
  }));

  void bulkCreateCostApi.read().then((prefs) => {
    if (prefs) {
      useBulkCreateCostStore.setState({
        preferences: prefs,
        initialized: true,
      });
    } else {
      useBulkCreateCostStore.setState({ initialized: true });
    }
  });

  const useAppSidebarNavExpansionStore = create<{
    sectionTitles: string[];
    initialized: boolean;
    setSectionExpanded: (title: string, expanded: boolean) => Promise<void>;
  }>((set, get) => ({
    sectionTitles: defaultAppSidebarNavExpandedSections.sectionTitles,
    initialized: false,
    setSectionExpanded: async (title, expanded) => {
      const prev = get().sectionTitles;
      const next = expanded
        ? [...new Set([...prev, title])]
        : prev.filter((t) => t !== title);
      set({ sectionTitles: next });
      await appSidebarNavExpandedSectionsApi.write({ sectionTitles: next });
    },
  }));

  void appSidebarNavExpandedSectionsApi.read().then((stored) => {
    useAppSidebarNavExpansionStore.setState({
      sectionTitles:
        stored?.sectionTitles ??
        defaultAppSidebarNavExpandedSections.sectionTitles,
      initialized: true,
    });
  });

  const useTmetricLiveContractorsLastRowCountStore = create<{
    rowCount: number | null;
    initialized: boolean;
    setRowCount: (n: number) => Promise<void>;
  }>((set, get) => ({
    rowCount: null,
    initialized: false,
    setRowCount: async (n) => {
      const clamped = tmetricLiveContractorsLastRowCountSchema.parse(
        Math.min(500, Math.max(0, Math.floor(n))),
      );
      if (get().rowCount === clamped) {
        return;
      }
      set({ rowCount: clamped });
      await tmetricLiveContractorsLastRowCountApi.write(clamped);
    },
  }));

  void tmetricLiveContractorsLastRowCountApi.read().then((stored) => {
    useTmetricLiveContractorsLastRowCountStore.setState({
      rowCount: stored,
      initialized: true,
    });
  });

  const useTmetricLiveLaneLegendModeStore = create<{
    mode: "full" | "dots";
    initialized: boolean;
    setMode: (m: "full" | "dots") => Promise<void>;
  }>((set, get) => ({
    mode: "full",
    initialized: false,
    setMode: async (m) => {
      const next = tmetricLiveLaneLegendModeSchema.parse(m);
      if (get().mode === next) {
        return;
      }
      set({ mode: next });
      await tmetricLiveLaneLegendModeApi.write(next);
    },
  }));

  void tmetricLiveLaneLegendModeApi.read().then((stored) => {
    useTmetricLiveLaneLegendModeStore.setState({
      mode: stored ?? "full",
      initialized: true,
    });
  });

  const useTmetricLiveLaneLegendModeCompactStore = create<{
    mode: "full" | "dots";
    initialized: boolean;
    setMode: (m: "full" | "dots") => Promise<void>;
  }>((set, get) => ({
    mode: "dots",
    initialized: false,
    setMode: async (m) => {
      const next = tmetricLiveLaneLegendModeSchema.parse(m);
      if (get().mode === next) {
        return;
      }
      set({ mode: next });
      await tmetricLiveLaneLegendModeCompactApi.write(next);
    },
  }));

  void tmetricLiveLaneLegendModeCompactApi.read().then((stored) => {
    useTmetricLiveLaneLegendModeCompactStore.setState({
      mode: stored ?? "dots",
      initialized: true,
    });
  });

  const useTmetricLivePageViewModeStore = create<{
    mode: "both" | "timeline" | "kpis";
    initialized: boolean;
    setMode: (m: "both" | "timeline" | "kpis") => Promise<void>;
  }>((set, get) => ({
    mode: "both",
    initialized: false,
    setMode: async (m) => {
      const next = tmetricLivePageViewModeSchema.parse(m);
      if (get().mode === next) {
        return;
      }
      set({ mode: next });
      await tmetricLivePageViewModeApi.write(next);
    },
  }));

  void tmetricLivePageViewModeApi.read().then((stored) => {
    useTmetricLivePageViewModeStore.setState({
      mode: stored ?? "both",
      initialized: true,
    });
  });

  const useCustomDashboardKpisStore = create<{
    kpis: CustomDashboardKpi[];
    initialized: boolean;
    setKpis: (kpis: CustomDashboardKpi[]) => Promise<void>;
  }>((set) => ({
    kpis: [],
    initialized: false,
    setKpis: async (kpis) => {
      set({ kpis });
      await customDashboardKpisApi.write(kpis);
    },
  }));

  void customDashboardKpisApi.read().then((stored) => {
    useCustomDashboardKpisStore.setState({
      kpis: stored ?? [],
      initialized: true,
    });
  });

  const useTrackerActiveContractorIdStore = create<{
    contractorId: number | null;
    initialized: boolean;
    setContractorId: (id: number | null) => Promise<void>;
  }>((set, get) => ({
    contractorId: null,
    initialized: false,
    setContractorId: async (id) => {
      const next = id !== null ? trackerActiveContractorIdSchema.parse(id) : null;
      if (get().contractorId === next) return;
      set({ contractorId: next });
      await trackerActiveContractorIdApi.write(next);
    },
  }));

  void trackerActiveContractorIdApi.read().then((stored) => {
    useTrackerActiveContractorIdStore.setState({
      contractorId: stored ?? null,
      initialized: true,
    });
  });

  /**
   * "Time until idle prompt" preference. Capped at [30s, 60min] to avoid
   * absurd values; default is 5 minutes which matches the typical
   * tmetric / toggl out-of-the-box behaviour.
   */
  const TRACKER_IDLE_DEFAULT_SECONDS = 5 * 60;
  const trackerIdleThresholdSchema = z
    .number()
    .int()
    .min(30)
    .max(60 * 60);
  const trackerIdleThresholdApi = createLocalStorageApi<number>(
    "tracker-idle-threshold-seconds-v1",
    (data) => {
      const result = trackerIdleThresholdSchema.safeParse(data);
      return result.success ? result.data : TRACKER_IDLE_DEFAULT_SECONDS;
    },
    TRACKER_IDLE_DEFAULT_SECONDS,
  );

  const useTrackerIdleThresholdStore = create<{
    seconds: number;
    initialized: boolean;
    setSeconds: (next: number) => Promise<void>;
  }>((set, get) => ({
    seconds: TRACKER_IDLE_DEFAULT_SECONDS,
    initialized: false,
    setSeconds: async (next) => {
      const parsed = trackerIdleThresholdSchema.parse(next);
      if (get().seconds === parsed) return;
      set({ seconds: parsed });
      await trackerIdleThresholdApi.write(parsed);
    },
  }));

  void trackerIdleThresholdApi.read().then((stored) => {
    useTrackerIdleThresholdStore.setState({
      seconds: stored ?? TRACKER_IDLE_DEFAULT_SECONDS,
      initialized: true,
    });
  });

  return {
    getIsDangerMode: () => usePreferences.getState().preferences.dangerMode,
    setIsDangerMode: (value: boolean) =>
      usePreferences.getState().setPreference("dangerMode", value),
    useIsDangerMode: () =>
      usePreferences((state) => state.preferences.dangerMode),
    useTimelineView: () => {
      const store = useTimelineViewStore();
      if (!store.initialized) {
        // Return default while loading
        return defaultTimelineViewPreferences;
      }
      return store.preferences;
    },
    getTimelineView: async () => {
      const prefs = await timelineViewApi.read();
      return prefs ?? defaultTimelineViewPreferences;
    },
    setTimelineView: async (partialPrefs: Partial<TimelineViewPreferences>) => {
      await useTimelineViewStore.getState().setPreferences(partialPrefs);
    },
    useBillingTimelineView: () => {
      const store = useBillingTimelineViewStore();
      if (!store.initialized) {
        return defaultBillingTimelineViewPreferences;
      }
      return store.preferences;
    },
    getBillingTimelineView: async () => {
      const prefs = await billingTimelineViewApi.read();
      return prefs ?? defaultBillingTimelineViewPreferences;
    },
    setBillingTimelineView: async (
      partialPrefs: Partial<BillingTimelineViewPreferences>,
    ) => {
      await useBillingTimelineViewStore.getState().setPreferences(partialPrefs);
    },
    useTimelineRangeShading: (scopeKey, defaults) => {
      const store = useTimelineRangeShadingStore();
      const fallback = defaults ?? defaultTimelineRangeShadingState;
      if (!store.initialized) {
        return fallback;
      }
      return store.preferencesByKey[scopeKey] ?? fallback;
    },
    getTimelineRangeShading: async (scopeKey) => {
      const prefs = (await timelineRangeShadingApi.read()) ?? {};
      return prefs[scopeKey] ?? null;
    },
    setTimelineRangeShading: async (scopeKey, partial) => {
      await useTimelineRangeShadingStore
        .getState()
        .setPreferences(scopeKey, partial);
    },
    getBudgetLogSyncState: async () => {
      const v = await budgetLogSyncApi.read();
      return v ?? null;
    },
    setBudgetLogSyncState: async (state: BudgetLogSyncState) => {
      await budgetLogSyncApi.write(state);
    },
    getBulkCreateCostPreferences: async () => {
      return (await bulkCreateCostApi.read()) ?? defaultBulkCreateCostPreferences;
    },
    setBulkCreateCostPreferences: async (
      partial: Partial<BulkCreateCostPreferences>,
    ) => {
      await useBulkCreateCostStore.getState().setPreferences(partial);
    },
    useBulkCreateCostPreferences: () => {
      const store = useBulkCreateCostStore();
      if (!store.initialized) {
        return defaultBulkCreateCostPreferences;
      }
      return store.preferences;
    },
    useAppSidebarNavExpansion: () => {
      const { sectionTitles, initialized, setSectionExpanded } =
        useAppSidebarNavExpansionStore();
      return {
        initialized,
        expandedSectionTitles: sectionTitles,
        setSectionExpanded,
      };
    },
    getLastProjectForNewIteration: async (scopeKey: string) => {
      const map = (await lastProjectForNewIterationApi.read()) ?? {};
      const id = map[scopeKey];
      return typeof id === "number" && id > 0 ? id : null;
    },
    setLastProjectForNewIteration: async (scopeKey: string, projectId: number) => {
      if (projectId <= 0) return;
      const map = { ...((await lastProjectForNewIterationApi.read()) ?? {}) };
      map[scopeKey] = projectId;
      await lastProjectForNewIterationApi.write(map);
    },
    useTmetricLiveContractorsPanelLastRowCount: () => {
      const { rowCount, initialized } =
        useTmetricLiveContractorsLastRowCountStore();
      if (!initialized) {
        return null;
      }
      return rowCount;
    },
    recordTmetricLiveContractorsPanelLastRowCount: async (rowCount: number) => {
      await useTmetricLiveContractorsLastRowCountStore
        .getState()
        .setRowCount(rowCount);
    },
    useTmetricLiveContractorsLaneLegendMode: () => {
      const { mode, initialized } = useTmetricLiveLaneLegendModeStore();
      if (!initialized) {
        return "full";
      }
      return mode;
    },
    setTmetricLiveContractorsLaneLegendMode: async (nextMode) => {
      await useTmetricLiveLaneLegendModeStore.getState().setMode(nextMode);
    },
    useTmetricLiveContractorsLaneLegendModeCompact: () => {
      const { mode, initialized } = useTmetricLiveLaneLegendModeCompactStore();
      if (!initialized) {
        return "dots";
      }
      return mode;
    },
    setTmetricLiveContractorsLaneLegendModeCompact: async (nextMode) => {
      await useTmetricLiveLaneLegendModeCompactStore.getState().setMode(nextMode);
    },
    useTmetricLivePageViewMode: () => {
      const { mode, initialized } = useTmetricLivePageViewModeStore();
      if (!initialized) {
        return "both";
      }
      return mode;
    },
    setTmetricLivePageViewMode: async (nextMode) => {
      await useTmetricLivePageViewModeStore.getState().setMode(nextMode);
    },
    useCustomDashboardKpis: () => {
      const { kpis } = useCustomDashboardKpisStore();
      return kpis;
    },
    getCustomDashboardKpis: async () => {
      return (await customDashboardKpisApi.read()) ?? [];
    },
    setCustomDashboardKpis: async (kpis) => {
      await useCustomDashboardKpisStore.getState().setKpis(kpis);
    },
    useTrackerActiveContractorId: () => {
      const { contractorId, initialized } = useTrackerActiveContractorIdStore();
      return initialized ? contractorId : null;
    },
    setTrackerActiveContractorId: async (id) => {
      await useTrackerActiveContractorIdStore.getState().setContractorId(id);
    },
    useTrackerIdleThresholdSeconds: () => {
      const { seconds, initialized } = useTrackerIdleThresholdStore();
      return initialized ? seconds : TRACKER_IDLE_DEFAULT_SECONDS;
    },
    setTrackerIdleThresholdSeconds: async (seconds) => {
      await useTrackerIdleThresholdStore.getState().setSeconds(seconds);
    },
  };
}
