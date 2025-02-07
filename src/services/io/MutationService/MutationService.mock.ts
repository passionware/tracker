import { MutationService } from "@/services/io/MutationService/MutationService.ts";
import { ArgsScopedAccessor } from "@passionware/platform-storybook";

export function createMutationService(
  onActionAccessor: ArgsScopedAccessor<(...args: unknown[]) => void>,
): MutationService {
  return {
    linkReportAndBilling: async () => {
      onActionAccessor.get()("Linking report and billing");
    },
    linkCostAndReport: async () => {
      onActionAccessor.get()("Linking cost and report");
    },
    createReport: async () => {
      onActionAccessor.get()("Creating report");
      return { id: 1 };
    },
    createBilling: async () => {
      onActionAccessor.get()("Creating billing");
      return { id: 1 };
    },
    createCost: async () => {
      onActionAccessor.get()("Creating cost");
      return { id: 1 };
    },
    deleteBillingReportLink: async () => {
      onActionAccessor.get()("Deleting billing report link");
    },
    deleteCostReportLink: async () => {
      onActionAccessor.get()("Deleting cost report link");
    },
    editReport: async () => {
      onActionAccessor.get()("Editing report");
    },
    editBilling: async () => {
      onActionAccessor.get()("Editing billing");
    },
    editCost: async () => {
      onActionAccessor.get()("Editing cost");
    },
    editProject: async () => {
      onActionAccessor.get()("Editing project");
    },
    updateCostReportLink: async () => {
      onActionAccessor.get()("Updating cost report link");
    },
    updateBillingReportLink: async () => {
      onActionAccessor.get()("Updating billing report link");
    },
    deleteCost: async () => {
      onActionAccessor.get()("Deleting cost");
    },
    deleteBilling: async () => {
      onActionAccessor.get()("Deleting billing");
    },
    deleteCostReport: async () => {
      onActionAccessor.get()("Deleting cost report");
    },
    createProject: async () => {
      onActionAccessor.get()("Creating project");
      return { id: 1 };
    },
    deleteProject: async () => {
      onActionAccessor.get()("Deleting project");
    },
  };
}
