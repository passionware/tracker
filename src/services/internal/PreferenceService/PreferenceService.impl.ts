import {
  BillingTimelineViewPreferences,
  BudgetLogSyncState,
  BulkCreateCostPreferences,
  PreferenceService,
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
  };
}
