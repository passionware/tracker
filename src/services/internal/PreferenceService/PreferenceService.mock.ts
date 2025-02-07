import { PreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { ArgsScopedAccessor } from "@passionware/platform-storybook";

export function createPreferenceService(config: {
  dangerMode: ArgsScopedAccessor<boolean>;
  onAction: ArgsScopedAccessor<(arg1: string, ...args: unknown[]) => void>;
}): PreferenceService {
  return {
    useIsDangerMode: config.dangerMode.use,
    getIsDangerMode: config.dangerMode.get,
    setIsDangerMode: (value: boolean) => {
      config.onAction.get()("setIsDangerMode", value);
    },
  };
}
