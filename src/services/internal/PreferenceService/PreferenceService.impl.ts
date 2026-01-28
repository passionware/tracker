import {
  PreferenceService,
  TimelineViewPreferences,
} from "@/services/internal/PreferenceService/PreferenceService.ts";
import { createLocalStorageApi } from "@/services/internal/PreferenceService/createLocalStorageApi.ts";
import { z } from "zod";
import { create } from "zustand";

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
});

const defaultTimelineViewPreferences: TimelineViewPreferences = {
  viewMode: "both",
  darkMode: false,
  splitRatio: 40,
  groupBy: "contractor",
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
  };
}
