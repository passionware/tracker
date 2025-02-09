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
            flowRoot: () => `/w/${workspaceSlot}/clients/${clientSlot}/flow`,
            reports: () =>
              `/w/${workspaceSlot}/clients/${clientSlot}/flow/reports`,
            charges: () =>
              `/w/${workspaceSlot}/clients/${clientSlot}/flow/charges`,
            costs: () => `/w/${workspaceSlot}/clients/${clientSlot}/flow/costs`,
            environmentRoot: () =>
              `/w/${workspaceSlot}/clients/${clientSlot}/environment`,
            variables: () =>
              `/w/${workspaceSlot}/clients/${clientSlot}/environment/variables`,
            potentialCosts: () =>
              `/w/${workspaceSlot}/clients/${clientSlot}/flow/potentialCosts`,
            root: () => `/w/${workspaceSlot}/clients/${clientSlot}`,
            forContractor: (contractorId) => {
              const contractorSlot =
                routingUtils.contractor.toString(contractorId);
              return {
                root: () =>
                  `/w/${workspaceSlot}/clients/${clientSlot}/contractors/${contractorSlot}`,
              };
            },
            projectsRoot: () =>
              `/w/${workspaceSlot}/clients/${clientSlot}/projects`,
            allProjects: () =>
              `/w/${workspaceSlot}/clients/${clientSlot}/projects/all`,
            currentProjects: () =>
              `/w/${workspaceSlot}/clients/${clientSlot}/projects/current`,
            pastProjects: () =>
              `/w/${workspaceSlot}/clients/${clientSlot}/projects/past`,
            forProject: (projectId = ":projectId") => {
              const base = `/w/${workspaceSlot}/clients/${clientSlot}/projects/${projectId}`;
              return {
                root: () => base,
                iterations: (status = ":projectIterationStatus") =>
                  `${base}/iterations/${status}`,
                reports: () => `${base}/reports`,
                configuration: () => `${base}/configuration`,
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
