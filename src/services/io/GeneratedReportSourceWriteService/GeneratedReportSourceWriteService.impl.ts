import { GeneratedReportSourceApi } from "@/api/generated-report-source/generated-report-source.api.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { GeneratedReportSourceWriteService } from "@/services/io/GeneratedReportSourceWriteService/GeneratedReportSourceWriteService.ts";

export function createGeneratedReportSourceWriteService({
  services,
  api,
}: WithServices<[WithMessageService]> & {
  api: GeneratedReportSourceApi;
}): GeneratedReportSourceWriteService {
  return {
    createGeneratedReportSource: async (payload) => {
      const response = await api.createGeneratedReportSource(payload);
      await services.messageService.reportSystemEffect.sendRequest({
        scope: "Creating generated report source",
      });
      return response;
    },

    updateGeneratedReportSource: async (id, payload) => {
      const response = await api.updateGeneratedReportSource(id, payload);
      await services.messageService.reportSystemEffect.sendRequest({
        scope: "Updating generated report source",
      });
      return response;
    },

    deleteGeneratedReportSource: async (id) => {
      await api.deleteGeneratedReportSource(id);
      await services.messageService.reportSystemEffect.sendRequest({
        scope: "Deleting generated report source",
      });
    },
  };
}
