import { myRouting } from "@/routing/myRouting.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import { EntityDrawerRouteLayout } from "@/features/_common/drawers/EntityDrawerRouteLayout.tsx";
import {
  ProtectedRoute,
  RenderIfAuthenticated,
} from "@/features/_common/ProtectedRoute.tsx";
import { AppSidebar } from "@/features/app/AppSidebar.tsx";
import { LoginPage } from "@/features/app/LoginWidget.tsx";
import {
  GeneratedReportIdResolver,
  IdResolver,
  ProjectIdResolver,
  ProjectIterationIdResolver,
} from "@/features/app/RootWidget.idResolvers.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { BillingEditModalWidget } from "@/features/billing/BillingEditModalWidget.tsx";
import { BillingWidget } from "@/features/billing/BillingWidget.tsx";
import { CockpitMainRouter } from "@/features/client-cockpit/ClientCockpitRouter.tsx";
import { CostEditModalWidget } from "@/features/costs/CostEditModalWidget.tsx";
import { CostWidget } from "@/features/costs/CostWidget.tsx";
import { PotentialCostWidget } from "@/features/costs/PotentialCostWidget.tsx";
import { IterationWidget } from "@/features/project-iterations/IterationWidget.tsx";
import { PositionEditModal } from "@/features/project-iterations/PositionEditModal.tsx";
import { ExportBuilderPage } from "@/features/project-iterations/widgets/ExportBuilderPage.tsx";
import { GroupedViewPage } from "@/features/project-iterations/widgets/GroupedViewPage.tsx";
import { ProjectDetailWidget } from "@/features/projects/ProjectDetailWidget.tsx";
import { ProjectListWidget } from "@/features/projects/ProjectListWidget.tsx";
import { PublicApp } from "@/features/public/PublicApp.tsx";
import { ReportEditModalWidget } from "@/features/reports/ReportEditModalWidget.tsx";
import { ReportsWidget } from "@/features/reports/ReportsWidget.tsx";
import { TmetricContractorDetailPage } from "@/features/tmetric-dashboard/TmetricContractorDetailPage";
import { TmetricDashboardPage } from "@/features/tmetric-dashboard/TmetricDashboardPage.tsx";
import { ClientsManageWidget } from "@/features/clients/ClientsManageWidget.tsx";
import { WorkspacesManageWidget } from "@/features/workspaces/WorkspacesManageWidget.tsx";
import { VariableEditModalWidget } from "@/features/variables/VariableEditModalWidget.tsx";
import { VariableWidget } from "@/features/variables/VariableWidget.tsx";
import { Layout } from "@/layout/AppLayout.tsx";
import { Navigate, Route, Routes } from "react-router-dom";
import { PrimaryAuthCallback } from "@/features/auth-callbacks/PrimaryAuthCallback.tsx";
import { CockpitAuthCallback } from "@/features/auth-callbacks/CockpitAuthCallback.tsx";

export function RootWidget(props: WithFrontServices) {
  return (
    <>
      <Routes>
        <Route
          path={myRouting.forGlobal().root()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <Navigate
                  to={myRouting
                    .forWorkspace(idSpecUtils.ofAll())
                    .forClient(idSpecUtils.ofAll())
                    .tmetricDashboard()}
                />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/login"
          element={<LoginPage services={props.services} />}
        />
        {/* OAuth callback routes */}
        <Route
          path="/auth/callback/primary"
          element={<PrimaryAuthCallback />}
        />
        <Route
          path="/auth/callback/cockpit"
          element={<CockpitAuthCallback />}
        />
        {/* Standalone Grouped View - With Sidebar but no breadcrumbs/tabs */}
        <Route
          path={
            myRouting
              .forWorkspace()
              .forClient()
              .forProject()
              .forIteration()
              .forGeneratedReport()
              .standaloneGroupedView() + "/*"
          }
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <ProjectIdResolver services={props.services}>
                      {(projectId) => (
                        <ProjectIterationIdResolver services={props.services}>
                          {(iterationId) => (
                            <GeneratedReportIdResolver
                              services={props.services}
                            >
                              {(reportId) => (
                                <GroupedViewPage
                                  projectIterationId={iterationId}
                                  workspaceId={workspaceId}
                                  clientId={clientId}
                                  projectId={projectId}
                                  reportId={reportId}
                                  services={props.services}
                                />
                              )}
                            </GeneratedReportIdResolver>
                          )}
                        </ProjectIterationIdResolver>
                      )}
                    </ProjectIdResolver>
                  )}
                </IdResolver>
              </Layout>
            </ProtectedRoute>
          }
        />
        {/* Export Builder Page */}
        <Route
          path={myRouting
            .forWorkspace()
            .forClient()
            .forProject()
            .forIteration()
            .forGeneratedReport()
            .export()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <ProjectIdResolver services={props.services}>
                      {(projectId) => (
                        <ProjectIterationIdResolver services={props.services}>
                          {(iterationId) => (
                            <GeneratedReportIdResolver
                              services={props.services}
                            >
                              {(reportId) => (
                                <ExportBuilderPage
                                  projectIterationId={iterationId}
                                  workspaceId={workspaceId}
                                  clientId={clientId}
                                  projectId={projectId}
                                  reportId={reportId}
                                  services={props.services}
                                />
                              )}
                            </GeneratedReportIdResolver>
                          )}
                        </ProjectIterationIdResolver>
                      )}
                    </ProjectIdResolver>
                  )}
                </IdResolver>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path={myRouting.forWorkspace().forClient().root()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <Navigate
                      to={myRouting
                        .forWorkspace(workspaceId)
                        .forClient(clientId)
                        .projectsRoot()}
                    />
                  )}
                </IdResolver>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path={myRouting
            .forWorkspace()
            .forClient()
            .reports()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <EntityDrawerRouteLayout
                      clientId={clientId}
                      workspaceId={workspaceId}
                      services={props.services}
                    >
                      <ReportsWidget
                        clientId={clientId}
                        workspaceId={workspaceId}
                        services={props.services}
                      />
                    </EntityDrawerRouteLayout>
                  )}
                </IdResolver>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path={myRouting
            .forWorkspace()
            .forClient()
            .charges()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <EntityDrawerRouteLayout
                      clientId={clientId}
                      workspaceId={workspaceId}
                      services={props.services}
                    >
                      <BillingWidget
                        clientId={clientId}
                        workspaceId={workspaceId}
                        services={props.services}
                      />
                    </EntityDrawerRouteLayout>
                  )}
                </IdResolver>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path={myRouting
            .forWorkspace()
            .forClient()
            .costs()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <EntityDrawerRouteLayout
                      clientId={clientId}
                      workspaceId={workspaceId}
                      services={props.services}
                    >
                      <CostWidget
                        workspaceId={workspaceId}
                        clientId={clientId}
                        services={props.services}
                      />
                    </EntityDrawerRouteLayout>
                  )}
                </IdResolver>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path={myRouting
            .forWorkspace()
            .forClient()
            .potentialCosts()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <EntityDrawerRouteLayout
                      clientId={clientId}
                      workspaceId={workspaceId}
                      services={props.services}
                    >
                      <PotentialCostWidget
                        workspaceId={workspaceId}
                        clientId={clientId}
                        services={props.services}
                      />
                    </EntityDrawerRouteLayout>
                  )}
                </IdResolver>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path={myRouting
            .forWorkspace()
            .forClient()
            .tmetricDashboardCube()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <TmetricDashboardPage
                      workspaceId={workspaceId}
                      clientId={clientId}
                      services={props.services}
                    />
                  )}
                </IdResolver>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path={myRouting
            .forWorkspace()
            .forClient()
            .tmetricDashboardTimeline()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <TmetricDashboardPage
                      workspaceId={workspaceId}
                      clientId={clientId}
                      services={props.services}
                    />
                  )}
                </IdResolver>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path={myRouting
            .forWorkspace()
            .forClient()
            .tmetricDashboardContractorFor()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <TmetricContractorDetailPage
                      workspaceId={workspaceId}
                      clientId={clientId}
                      services={props.services}
                    />
                  )}
                </IdResolver>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path={myRouting
            .forWorkspace()
            .forClient()
            .tmetricDashboardContractor()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <TmetricDashboardPage
                      workspaceId={workspaceId}
                      clientId={clientId}
                      services={props.services}
                    />
                  )}
                </IdResolver>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path={myRouting
            .forWorkspace()
            .forClient()
            .tmetricDashboard()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <TmetricDashboardPage
                      workspaceId={workspaceId}
                      clientId={clientId}
                      services={props.services}
                    />
                  )}
                </IdResolver>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path={myRouting
            .forWorkspace()
            .forClient()
            .variables()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <VariableWidget
                      clientId={clientId}
                      workspaceId={workspaceId}
                      services={props.services}
                    />
                  )}
                </IdResolver>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/w/:workspaceId/clients/:clientId/environment/clients"
          element={
            <Navigate
              to={myRouting.forGlobal().manageClients()}
              replace
            />
          }
        />
        <Route
          path="/w/:workspaceId/clients/:clientId/environment/workspaces"
          element={
            <Navigate
              to={myRouting.forGlobal().manageWorkspaces()}
              replace
            />
          }
        />
        <Route
          path={myRouting.forGlobal().manageClients()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <EntityDrawerRouteLayout
                      clientId={clientId}
                      workspaceId={workspaceId}
                      services={props.services}
                    >
                      <ClientsManageWidget
                        clientId={clientId}
                        workspaceId={workspaceId}
                        services={props.services}
                      />
                    </EntityDrawerRouteLayout>
                  )}
                </IdResolver>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path={myRouting.forGlobal().manageWorkspaces()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <EntityDrawerRouteLayout
                      clientId={clientId}
                      workspaceId={workspaceId}
                      services={props.services}
                    >
                      <WorkspacesManageWidget
                        clientId={clientId}
                        workspaceId={workspaceId}
                        services={props.services}
                      />
                    </EntityDrawerRouteLayout>
                  )}
                </IdResolver>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path={myRouting
            .forWorkspace()
            .forClient()
            .allProjects()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <ProjectListWidget
                      filter={null}
                      clientId={clientId}
                      workspaceId={workspaceId}
                      services={props.services}
                    />
                  )}
                </IdResolver>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path={myRouting
            .forWorkspace()
            .forClient()
            .activeProjects()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <ProjectListWidget
                      filter={{
                        operator: "oneOf",
                        value: ["active", "draft"],
                      }}
                      clientId={clientId}
                      workspaceId={workspaceId}
                      services={props.services}
                    />
                  )}
                </IdResolver>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path={myRouting
            .forWorkspace()
            .forClient()
            .closedProjects()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <ProjectListWidget
                      filter={{
                        operator: "oneOf",
                        value: ["closed"],
                      }}
                      clientId={clientId}
                      workspaceId={workspaceId}
                      services={props.services}
                    />
                  )}
                </IdResolver>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path={myRouting
            .forWorkspace()
            .forClient()
            .projectsRoot()}
          element={
            <IdResolver services={props.services}>
              {(workspaceId, clientId) => (
                <Navigate
                  replace
                  to={myRouting
                    .forWorkspace(workspaceId)
                    .forClient(clientId)
                    .activeProjects()}
                />
              )}
            </IdResolver>
          }
        />
        <Route
          path={`${myRouting
            .forWorkspace()
            .forClient()
            .forProject()
            .root()}/*`}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <ProjectIdResolver services={props.services}>
                      {(projectId) => (
                        <ProjectDetailWidget
                          clientId={clientId}
                          workspaceId={workspaceId}
                          projectId={projectId}
                          services={props.services}
                        />
                      )}
                    </ProjectIdResolver>
                  )}
                </IdResolver>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path={`${myRouting
            .forWorkspace()
            .forClient()
            .forProject()
            .forIteration()
            .root()}/*`}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <ProjectIdResolver services={props.services}>
                      {(projectId) => (
                        <ProjectIterationIdResolver services={props.services}>
                          {(projectIterationId) => (
                            <IterationWidget
                              workspaceId={workspaceId}
                              clientId={clientId}
                              projectId={projectId}
                              services={props.services}
                              projectIterationId={projectIterationId}
                            />
                          )}
                        </ProjectIterationIdResolver>
                      )}
                    </ProjectIdResolver>
                  )}
                </IdResolver>
              </Layout>
            </ProtectedRoute>
          }
        />
        {/* Public routes - no authentication required */}
        <Route path="/p/*" element={<PublicApp services={props.services} />} />
        <Route
          path={`${myRouting.forClientCockpit().root()}/*`}
          element={<CockpitMainRouter services={props.services} />}
        />
      </Routes>
      <RenderIfAuthenticated services={props.services}>
        <VariableEditModalWidget services={props.services} />
        <ReportEditModalWidget services={props.services} />
        <CostEditModalWidget services={props.services} />
        <BillingEditModalWidget services={props.services} />
        <PositionEditModal services={props.services} />
      </RenderIfAuthenticated>
    </>
  );
}
