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
    createBilling: async (billing) => {
      const response = await api.createBilling(billing);
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
    bulkDeleteCostReport: async (reportIds) => {
      if (config.services.preferenceService.getIsDangerMode()) {
        await api.bulkDeleteCostReport(reportIds);
        await config.services.messageService.reportSystemEffect.sendRequest({
          scope: "Bulk deleting cost reports",
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
    editBilling: async (billingId, payload) => {
      await api.editBilling(billingId, payload);
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
    editProject: async (projectId, payload) => {
      await api.editProject(projectId, payload);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Editing project",
      });
    },
    updateBillingReportLink: async (linkId, payload) => {
      await api.updateBillingReportLink(linkId, payload);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Updating billing report link",
      });
    },
    updateCostReportLink: async (linkId, payload) => {
      await api.updateCostReportLink(linkId, payload);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Updating cost report link",
      });
    },
    createProject: async (project) => {
      const response = await api.createProject(project);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Creating project",
      });
      return response;
    },
    deleteProject: async (projectId) => {
      if (config.services.preferenceService.getIsDangerMode()) {
        await api.deleteProject(projectId);
        await config.services.messageService.reportSystemEffect.sendRequest({
          scope: "Deleting project",
        });
      } else {
        throw new Error("Danger mode is not enabled");
      }
    },
    createProjectIteration: async (iteration) => {
      const response = await api.createProjectIteration(iteration);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Creating project iteration",
      });
      return response;
    },

    editProjectIterationPosition: async (positionId, payload) => {
      await api.editProjectIterationPosition(positionId, payload);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Editing project iteration position",
      });
    },
    createProjectIterationPosition: async (position) => {
      const response = await api.createProjectIterationPosition(position);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Creating project iteration position",
      });
      return response;
    },
    editProjectIteration: async (iterationId, payload) => {
      await api.editProjectIteration(iterationId, payload);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Editing project iteration",
      });
    },
    bulkEditProjectIteration: async (iterationIds, payload) => {
      await api.bulkEditProjectIteration(iterationIds, payload);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Bulk editing project iterations",
      });
    },
    deleteProjectIterationPosition: async (positionId) => {
      await api.deleteProjectIterationPosition(positionId);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Deleting project iteration position",
      });
    },
    deleteProjectIteration: async (iterationId) => {
      await api.deleteProjectIteration(iterationId);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Deleting project iteration",
      });
    },
    addContractorToProject: async (projectId, contractorId, workspaceId) => {
      await api.addContractorToProject(projectId, contractorId, workspaceId);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Adding contractor to project",
      });
    },
    unassignContractorFromProject: async (projectId, contractorId) => {
      await api.unassignContractorFromProject(projectId, contractorId);
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Unassigning contractor from project",
      });
    },
    updateContractorWorkspaceForProject: async (
      projectId,
      contractorId,
      workspaceId,
    ) => {
      await api.updateContractorWorkspaceForProject(
        projectId,
        contractorId,
        workspaceId,
      );
      await config.services.messageService.reportSystemEffect.sendRequest({
        scope: "Updating contractor workspace for project",
      });
    },
  };
}
