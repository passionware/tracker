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
    linkCostAndReport: async (payload) => {
      await api.linkCostAndReport(payload);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Linking cost and report",
      });
    },
    createReport: async (report) => {
      const response = await api.createReport(report);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Creating contractor report",
      });
      return response;
    },
    createClientBilling: async (billing) => {
      const response = await api.createClientBilling(billing);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Creating client billing",
      });
      return response;
    },
    createCost: async (cost) => {
      const response = await api.createCost(cost);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Creating cost",
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
    deleteCostReportLink: async (linkId) => {
      if (config.services.preferenceService.getIsDangerMode()) {
        await api.deleteCostReportLink(linkId);
        await config.services.messageService.reportSystemEffect.sendRequest({
          scope: "Deleting cost report link",
        });
      } else {
        throw new Error("Danger mode is not enabled");
      }
    },
    deleteCostReport: async (reportId) => {
      if (config.services.preferenceService.getIsDangerMode()) {
        await api.deleteCostReport(reportId);
        await config.services.messageService.reportSystemEffect.sendRequest({
          scope: "Deleting cost report",
        });
      } else {
        throw new Error("Danger mode is not enabled");
      }
    },
    deleteBilling: async (billingId) => {
      if (config.services.preferenceService.getIsDangerMode()) {
        await api.deleteBilling(billingId);
        await config.services.messageService.reportSystemEffect.sendRequest({
          scope: "Deleting billing",
        });
      } else {
        throw new Error("Danger mode is not enabled");
      }
    },
    deleteCost: async (costId) => {
      if (config.services.preferenceService.getIsDangerMode()) {
        await api.deleteCost(costId);
        await config.services.messageService.reportSystemEffect.sendRequest({
          scope: "Deleting cost",
        });
      } else {
        throw new Error("Danger mode is not enabled");
      }
    },
    editCost: async (costId, payload) => {
      await api.editCost(costId, payload);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Editing cost",
      });
    },
    editClientBilling: async (billingId, payload) => {
      await api.editClientBilling(billingId, payload);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Editing client billing",
      });
    },
    editReport: async (reportId, payload) => {
      await api.editReport(reportId, payload);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Editing report",
      });
    },
  };
}
