import { delay } from "@/platform/lang/delay.ts";
import { MutationService } from "@/services/io/MutationService/MutationService.ts";
import { ArgsScopedAccessor } from "@passionware/platform-storybook";

export function createMutationService(
  onActionAccessor: ArgsScopedAccessor<
    (arg1: string, ...args: unknown[]) => void
  >,
  responseDelay = 500,
): MutationService {
  const wait = () => delay(responseDelay);
  return {
    linkReportAndBilling: async () => {
      onActionAccessor.get()("Linking report and billing");
      await wait();
    },
    linkCostAndReport: async () => {
      onActionAccessor.get()("Linking cost and report");
      await wait();
    },
    createReport: async () => {
      onActionAccessor.get()("Creating report");
      await wait();
      return { id: 1 };
    },
    createBilling: async () => {
      onActionAccessor.get()("Creating billing");
      await wait();
      return { id: 1 };
    },
    createCost: async () => {
      onActionAccessor.get()("Creating cost");
      await wait();
      return { id: 1 };
    },
    deleteBillingReportLink: async () => {
      onActionAccessor.get()("Deleting billing report link");
      await wait();
    },
    deleteCostReportLink: async () => {
      onActionAccessor.get()("Deleting cost report link");
      await wait();
    },
    editReport: async () => {
      onActionAccessor.get()("Editing report");
      await wait();
    },
    editBilling: async () => {
      onActionAccessor.get()("Editing billing");
      await wait();
    },
    editCost: async () => {
      onActionAccessor.get()("Editing cost");
      await wait();
    },
    editProject: async () => {
      onActionAccessor.get()("Editing project");
      await wait();
    },
    updateCostReportLink: async () => {
      onActionAccessor.get()("Updating cost report link");
      await wait();
    },
    updateBillingReportLink: async () => {
      onActionAccessor.get()("Updating billing report link");
      await wait();
    },
    deleteCost: async () => {
      onActionAccessor.get()("Deleting cost");
      await wait();
    },
    deleteBilling: async () => {
      onActionAccessor.get()("Deleting billing");
      await wait();
    },
    deleteCostReport: async () => {
      onActionAccessor.get()("Deleting cost report");
      await wait();
    },
    createProject: async () => {
      onActionAccessor.get()("Creating project");
      await wait();
      return { id: 1 };
    },
    deleteProject: async () => {
      onActionAccessor.get()("Deleting project");
      await wait();
    },
    createProjectIteration: async () => {
      onActionAccessor.get()("Creating project iteration");
      await wait();
      return { id: 1 };
    },
    editProjectIteration: async () => {
      onActionAccessor.get()("Editing project iteration");
      await wait();
    },
    createProjectIterationPosition: async () => {
      onActionAccessor.get()("Creating project iteration position");
      await wait();
      return { id: 1 };
    },
    editProjectIterationPosition: async () => {
      onActionAccessor.get()("Editing project iteration position");
      await wait();
    },
    deleteProjectIterationPosition: async () => {
      onActionAccessor.get()("Deleting project iteration position");
      await wait();
    },

    deleteProjectIteration: async () => {
      onActionAccessor.get()("Deleting project iteration");
      await wait();
    },
    addContractorToProject: async () => {
      onActionAccessor.get()("Adding contractor to project");
      await wait();
    },
    unassignContractorFromProject: async () => {
      onActionAccessor.get()("Unassigning contractor from project");
      await wait();
    },
  };
}
