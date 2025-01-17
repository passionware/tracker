import {
  RoutingService,
  routingUtils,
} from "@/services/front/RoutingService/RoutingService.ts";

export function createRoutingService(): RoutingService {
  return {
    forWorkspace: (workspaceId) => {
      const workspaceSlot = routingUtils.workspace.toString(workspaceId);
      return {
        root: () => `/w/${workspaceSlot}`,
        forClient: (clientId) => {
          const clientSlot = routingUtils.client.toString(clientId);
          return {
            reports: () => `/w/${workspaceSlot}/clients/${clientSlot}/reports`,
            charges: () => `/w/${workspaceSlot}/clients/${clientSlot}/charges`,
            costs: () => `/w/${workspaceSlot}/clients/${clientSlot}/costs`,
            variables: () =>
              `/w/${workspaceSlot}/clients/${clientSlot}/variables`,
            potentialCosts: () =>
              `/w/${workspaceSlot}/clients/${clientSlot}/potentialCosts`,
            root: () => `/w/${workspaceSlot}/clients/${clientSlot}`,
            forContractor: (contractorId) => {
              const contractorSlot =
                routingUtils.contractor.toString(contractorId);
              return {
                root: () =>
                  `/w/${workspaceSlot}/clients/${clientSlot}/contractors/${contractorSlot}`,
              };
            },
          };
        },
      };
    },
    forGlobal: () => ({
      root: () => "/",
    }),
  };
}
