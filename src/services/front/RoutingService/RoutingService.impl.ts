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
              const base = `/w/${workspaceSlot}/clients/${clientSlot}/projects/${projectId}`;
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
                    forGeneratedReport: (reportId = ":generatedReportId") => {
                      return {
                        root: () => `${base2}/generated-reports/${reportId}`,
                        basic: () =>
                          `${base2}/generated-reports/${reportId}/basic`,
                        timeEntries: () =>
                          `${base2}/generated-reports/${reportId}/time-entries`,
                        groupedView: (cubePath) => {
                          const cubePathSegment =
                            routingUtils.cubePath.toString(cubePath);
                          const baseUrl = `${base2}/generated-reports/${reportId}/grouped-view`;
                          return cubePathSegment
                            ? `${baseUrl}/${cubePathSegment}`
                            : baseUrl;
                        },
                        standaloneGroupedView: (cubePath) => {
                          const cubePathSegment =
                            routingUtils.cubePath.toString(cubePath);
                          const baseUrl = `${base2}/generated-reports/${reportId}/standalone-grouped-view`;
                          return cubePathSegment
                            ? `${baseUrl}/${cubePathSegment}`
                            : baseUrl;
                        },
                        export: () =>
                          `${base2}/generated-reports/${reportId}/export`,
                      };
                    },
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

    forClientCockpit: () => ({
      root: () => "/c",
      login: () => "/c/login",
      forClient: (clientId = ":clientId") => ({
        root: () => `/c/${clientId}`,
        reports: () => `/c/${clientId}/reports`,
        forReport: (reportId = ":reportId") => ({
          root: () => `/c/${clientId}/reports/${reportId}`,
          preview: () => `/c/${clientId}/reports/${reportId}/preview`,
          cubeViewer: () => `/c/${clientId}/reports/${reportId}/cube-viewer`,
        }),
      }),
    }),
  };
}
