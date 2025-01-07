import { PreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
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

  return {
    getIsDangerMode: () => usePreferences.getState().preferences.dangerMode,
    setIsDangerMode: (value: boolean) =>
      usePreferences.getState().setPreference("dangerMode", value),
    useIsDangerMode: () =>
      usePreferences((state) => state.preferences.dangerMode),
  };
}
