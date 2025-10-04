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
            activeProjects: () =>
              `/w/${workspaceSlot}/clients/${clientSlot}/projects/active`,
            closedProjects: () =>
              `/w/${workspaceSlot}/clients/${clientSlot}/projects/closed`,
            forProject: (projectId = ":projectId") => {
              const base = `/w/${workspaceSlot}/clients/${clientSlot}/project/${projectId}`;
              return {
                root: () => base,
                iterations: (status = ":projectIterationStatus") =>
                  `${base}/iterations/${status}`,
                details: () => `${base}/details`,
                contractors: () => `${base}/contractors`,
                forIteration: (iterationId = ":iterationId") => {
                  const base2 = `${base}/iteration/${iterationId}`;
                  return {
                    root: () => base2,
                    events: () => `${base2}/events`,
                    reports: () => `${base2}/reports`,
                    generatedReports: () => `${base2}/generated-reports`,
                    billings: () => `${base2}/billings`,
                  };
                },
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
