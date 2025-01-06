import { MutationApi } from "@/api/mutation/mutation.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { MutationService } from "@/services/io/MutationService/MutationService.ts";

export function createMutationService(
  config: WithServices<[WithMessageService]>,
  api: MutationApi,
): MutationService {
  return {
    linkReportAndBilling: async (payload) => {
      await api.linkReportAndBilling(payload);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Linking report and billing",
      });
    },
  };
}
