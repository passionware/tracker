import { MutationApi } from "@/api/mutation/mutation.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { MutationService } from "@/services/io/MutationService/MutationService.ts";

export function createMutationService(
  config: WithServices<[WithMessageService, WithPreferenceService]>,
  api: MutationApi,
): MutationService {
  return {
    linkReportAndBilling: async (payload) => {
      await api.linkReportAndBilling(payload);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Linking report and billing",
      });
    },
    createContractorReport: async (report) => {
      const response = await api.createContractorReport(report);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Creating contractor report",
      });
      return response;
    },
    deleteBillingReportLink: async (linkId) => {
      if (config.services.preferenceService.getIsDangerMode()) {
        await api.deleteBillingReportLink(linkId);
        await config.services.messageService.reportSystemEffect.sendRequest({
          scope: "Deleting billing report link",
        });
      } else {
        throw new Error("Danger mode is not enabled");
      }
    },
  };
}
