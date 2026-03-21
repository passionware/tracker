import { routingUtils } from "@/routing/routingUtils.ts";

/**
 * Canonical path builders for the app. Prefer this over injecting a routing service.
 */
export const myRouting = {
  forWorkspace: (workspaceId?: Parameters<typeof routingUtils.workspace.toString>[0]) => {
    const workspaceSlot = routingUtils.workspace.toString(workspaceId);
    return {
      root: () => `/w/${workspaceSlot}`,
      forClient: (clientId?: Parameters<typeof routingUtils.client.toString>[0]) => {
        const clientSlot = routingUtils.client.toString(clientId);
        return {
          flowRoot: () => `/w/${workspaceSlot}/clients/${clientSlot}/flow`,
          reports: () =>
            `/w/${workspaceSlot}/clients/${clientSlot}/flow/reports`,
          charges: () =>
            `/w/${workspaceSlot}/clients/${clientSlot}/flow/charges`,
          costs: () =>
            `/w/${workspaceSlot}/clients/${clientSlot}/flow/costs`,
          environmentRoot: () =>
            `/w/${workspaceSlot}/clients/${clientSlot}/environment`,
          variables: () =>
            `/w/${workspaceSlot}/clients/${clientSlot}/environment/variables`,
          potentialCosts: () =>
            `/w/${workspaceSlot}/clients/${clientSlot}/flow/potentialCosts`,
          tmetricDashboard: () =>
            `/w/${workspaceSlot}/clients/${clientSlot}/tmetric-dashboard`,
          tmetricDashboardCube: () =>
            `/w/${workspaceSlot}/clients/${clientSlot}/tmetric-dashboard/cube`,
          tmetricDashboardTimeline: () =>
            `/w/${workspaceSlot}/clients/${clientSlot}/tmetric-dashboard/timeline`,
          tmetricDashboardContractor: () =>
            `/w/${workspaceSlot}/clients/${clientSlot}/tmetric-dashboard/contractor`,
          tmetricDashboardContractorFor: (contractorId?: Parameters<
            typeof routingUtils.contractor.toString
          >[0]) =>
            `/w/${workspaceSlot}/clients/${clientSlot}/tmetric-dashboard/contractor/${routingUtils.contractor.toString(contractorId)}`,
          root: () => `/w/${workspaceSlot}/clients/${clientSlot}`,
          forContractor: (contractorId?: Parameters<
            typeof routingUtils.contractor.toString
          >[0]) => {
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
          forProject: (projectId: string | ":projectId" = ":projectId") => {
            const base = `/w/${workspaceSlot}/clients/${clientSlot}/projects/${projectId}`;
            return {
              root: () => base,
              iterations: (
                status: "all" | "active" | "closed" | ":projectIterationStatus" = ":projectIterationStatus",
              ) => `${base}/iterations/${status}`,
              details: () => `${base}/details`,
              contractors: () => `${base}/contractors`,
              forIteration: (iterationId: string | ":iterationId" = ":iterationId") => {
                const base2 = `${base}/iteration/${iterationId}`;
                return {
                  root: () => base2,
                  positions: () => `${base2}/positions`,
                  events: () => `${base2}/events`,
                  reports: () => `${base2}/reports`,
                  generatedReports: () => `${base2}/generated-reports`,
                  forGeneratedReport: (
                    reportId: string | ":generatedReportId" = ":generatedReportId",
                  ) => {
                    return {
                      root: () => `${base2}/generated-reports/${reportId}`,
                      basic: () =>
                        `${base2}/generated-reports/${reportId}/basic`,
                      timeEntries: () =>
                        `${base2}/generated-reports/${reportId}/time-entries`,
                      groupedView: (cubePath?: Parameters<
                        typeof routingUtils.cubePath.toString
                      >[0]) => {
                        const cubePathSegment =
                          routingUtils.cubePath.toString(cubePath);
                        const baseUrl = `${base2}/generated-reports/${reportId}/grouped-view`;
                        return cubePathSegment
                          ? `${baseUrl}/${cubePathSegment}`
                          : baseUrl;
                      },
                      standaloneGroupedView: (cubePath?: Parameters<
                        typeof routingUtils.cubePath.toString
                      >[0]) => {
                        const cubePathSegment =
                          routingUtils.cubePath.toString(cubePath);
                        const baseUrl = `${base2}/generated-reports/${reportId}/standalone-grouped-view`;
                        return cubePathSegment
                          ? `${baseUrl}/${cubePathSegment}`
                          : baseUrl;
                      },
                      export: () =>
                        `${base2}/generated-reports/${reportId}/export`,
                      reconciliation: () =>
                        `${base2}/generated-reports/${reportId}/reconciliation`,
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
    configuration: () => "/configuration",
    manageClients: () => "/configuration/clients",
    manageWorkspaces: () => "/configuration/workspaces",
  }),

  forClientCockpit: () => ({
    root: () => "/c",
    login: () => "/c/login",
    forClient: (clientId: string | ":clientId" = ":clientId") => ({
      root: () => `/c/${clientId}`,
      reports: () => `/c/${clientId}/reports`,
      forReport: (reportId: string | ":reportId" = ":reportId") => ({
        root: () => `/c/${clientId}/reports/${reportId}`,
        preview: () => `/c/${clientId}/reports/${reportId}/preview`,
        cubeViewer: () => `/c/${clientId}/reports/${reportId}/cube-viewer`,
        pdfExportBuilder: () =>
          `/c/${clientId}/reports/${reportId}/pdf-export-builder`,
      }),
    }),
  }),
};
