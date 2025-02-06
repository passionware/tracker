import {
  ProtectedRoute,
  RenderIfAuthenticated,
} from "@/features/_common/ProtectedRoute.tsx";
import { AppSidebar } from "@/features/app/AppSidebar.tsx";
import { LoginPage } from "@/features/app/LoginWidget.tsx";
import {
  IdResolver,
  ProjectIdResolver,
} from "@/features/app/RootWidget.idResolvers.tsx";
import { SelectClientPage } from "@/features/app/SelectClientPage.tsx";
import { BillingEditModalWidget } from "@/features/billing/BillingEditModalWidget.tsx";
import { BillingWidget } from "@/features/billing/BillingWidget.tsx";
import { CostEditModalWidget } from "@/features/costs/CostEditModalWidget.tsx";
import { CostWidget } from "@/features/costs/CostWidget.tsx";
import { PotentialCostWidget } from "@/features/costs/PotentialCostWidget.tsx";
import { Dashboard } from "@/features/dashboard/Dashboard.tsx";
import { ProjectDetailWidget } from "@/features/projects/ProjectDetailWidget.tsx";
import { ProjectListWidget } from "@/features/projects/ProjectListWidget.tsx";
import { ReportEditModalWidget } from "@/features/reports/ReportEditModalWidget.tsx";
import { ReportsWidget } from "@/features/reports/ReportsWidget.tsx";
import { VariableEditModalWidget } from "@/features/variables/VariableEditModalWidget.tsx";
import { VariableWidget } from "@/features/variables/VariableWidget.tsx";
import { Layout } from "@/layout/AppLayout.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithExpressionService } from "@/services/front/ExpressionService/ExpressionService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithRoutingService } from "@/services/front/RoutingService/RoutingService.ts";
import { WithLocationService } from "@/services/internal/LocationService/LocationService.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { WithNavigationService } from "@/services/internal/NavigationService/NavigationService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithAuthService } from "@/services/io/AuthService/AuthService.ts";
import { WithBillingService } from "@/services/io/BillingService/BillingService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithCostService } from "@/services/io/CostService/CostService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithProjectService } from "@/services/io/ProjectService/ProjectService.ts";
import { WithReportService } from "@/services/io/ReportService/ReportService";
import { WithVariableService } from "@/services/io/VariableService/VariableService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { Route, Routes } from "react-router-dom";

export function RootWidget(
  props: WithServices<
    [
      WithAuthService,
      WithClientService,
      WithLocationService,
      WithRoutingService,
      WithFormatService,
      WithReportDisplayService,
      WithMutationService,
      WithContractorService,
      WithNavigationService,
      WithWorkspaceService,
      WithCostService,
      WithPreferenceService,
      WithVariableService,
      WithMessageService,
      WithReportService,
      WithBillingService,
      WithExpressionService,
      WithProjectService,
    ]
  >,
) {
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
        <Route
          path={props.services.routingService.forWorkspace().forClient().root()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <Dashboard
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
                      filter="all"
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
            .currentProjects()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <ProjectListWidget
                      filter="current"
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
            .pastProjects()}
          element={
            <ProtectedRoute services={props.services}>
              <Layout sidebarSlot={<AppSidebar services={props.services} />}>
                <IdResolver services={props.services}>
                  {(workspaceId, clientId) => (
                    <ProjectListWidget
                      filter="past"
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
            .forProject()
            .root()}
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
      </Routes>
      <RenderIfAuthenticated services={props.services}>
        <VariableEditModalWidget services={props.services} />
        <ReportEditModalWidget services={props.services} />
        <CostEditModalWidget services={props.services} />
        <BillingEditModalWidget services={props.services} />
      </RenderIfAuthenticated>
    </>
  );
}
