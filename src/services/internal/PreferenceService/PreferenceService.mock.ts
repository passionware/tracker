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
    useTimelineView: () => {
      return {
        viewMode: "both",
        darkMode: false,
        splitRatio: 40,
        groupBy: "contractor",
        colorBy: "billing-status",
      };
    },
    getTimelineView: async () => {
      return {
        viewMode: "both",
        darkMode: false,
        splitRatio: 40,
        groupBy: "contractor",
        colorBy: "billing-status",
      };
    },
    setTimelineView: async () => {
      return;
    },
    useBillingTimelineView: () => ({
      colorBy: "payment-status",
    }),
    getBillingTimelineView: async () => ({
      colorBy: "payment-status",
    }),
    setBillingTimelineView: async () => {},
    useTimelineRangeShading: (_scopeKey, defaults) =>
      defaults ?? {
        night: true,
        weekend: true,
      },
    getTimelineRangeShading: async () => null,
    setTimelineRangeShading: async () => {},
    getBudgetLogSyncState: async () => null,
    setBudgetLogSyncState: async () => {},
    getBulkCreateCostPreferences: async () => ({
      paymentDeductionPercent: 0,
      vatPercent: 23,
    }),
    setBulkCreateCostPreferences: async () => {},
    useBulkCreateCostPreferences: () => ({
      paymentDeductionPercent: 0,
      vatPercent: 23,
    }),
    useAppSidebarNavExpansion: () => ({
      initialized: true,
      expandedSectionTitles: [],
      setSectionExpanded: async () => {},
    }),
    getLastProjectForNewIteration: async () => null,
    setLastProjectForNewIteration: async () => {},
    useTmetricLiveContractorsPanelLastRowCount: () => null,
    recordTmetricLiveContractorsPanelLastRowCount: async () => {},
    useTmetricLiveContractorsLaneLegendMode: () => "full",
    setTmetricLiveContractorsLaneLegendMode: async () => {},
    useTmetricLiveContractorsLaneLegendModeCompact: () => "dots",
    setTmetricLiveContractorsLaneLegendModeCompact: async () => {},
    useTmetricLivePageViewMode: () => "both",
    setTmetricLivePageViewMode: async () => {},
    useCustomDashboardKpis: () => [],
    getCustomDashboardKpis: async () => [],
    setCustomDashboardKpis: async () => {},
  };
}
