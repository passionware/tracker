import { WithFrontServices } from "@/core/frontServices.ts";
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
import { SelectClientPage } from "@/features/app/SelectClientPage.tsx";
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
import { VariableEditModalWidget } from "@/features/variables/VariableEditModalWidget.tsx";
import { VariableWidget } from "@/features/variables/VariableWidget.tsx";
import { Layout } from "@/layout/AppLayout.tsx";
import { Navigate, Route, Routes } from "react-router-dom";

// ============================================================================
// Client Cockpit Router Wrapper
// ============================================================================
function ClientCockpitRouterWrapper() {
  return <CockpitMainRouter />;
}

export function RootWidget(props: WithFrontServices) {
  return (
    <>
      <Routes>
        <Route
          path={props.services.routingService.forGlobal().root()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <SelectClientPage services={props.services} />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/login"
          element={<LoginPage services={props.services} />}
        />
        {/* Standalone Grouped View - With Sidebar but no breadcrumbs/tabs */}
        <Route
          path={
            props.services.routingService
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
          path={props.services.routingService
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
          path={props.services.routingService.forWorkspace().forClient().root()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <Navigate
                      to={props.services.routingService
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
          path={props.services.routingService
            .forWorkspace()
            .forClient()
            .reports()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <ReportsWidget
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
          path={props.services.routingService
            .forWorkspace()
            .forClient()
            .charges()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <BillingWidget
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
          path={props.services.routingService
            .forWorkspace()
            .forClient()
            .costs()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <CostWidget
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
          path={props.services.routingService
            .forWorkspace()
            .forClient()
            .potentialCosts()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <PotentialCostWidget
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
          path={props.services.routingService
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
          path={props.services.routingService
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
          path={props.services.routingService
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
          path={props.services.routingService
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
          path={props.services.routingService
            .forWorkspace()
            .forClient()
            .projectsRoot()}
          element={
            <IdResolver services={props.services}>
              {(workspaceId, clientId) => (
                <Navigate
                  replace
                  to={props.services.routingService
                    .forWorkspace(workspaceId)
                    .forClient(clientId)
                    .activeProjects()}
                />
              )}
            </IdResolver>
          }
        />
        <Route
          path={`${props.services.routingService
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
          path={`${props.services.routingService
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
        <Route path="/p/*" element={<PublicApp />} />
        <Route
          path={`${props.services.routingService.forClientCockpit().root()}/*`}
          element={<ClientCockpitRouterWrapper />}
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
