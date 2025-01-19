import {
  ProtectedRoute,
  RenderIfAuthenticated,
} from "@/features/_common/ProtectedRoute.tsx";
import { AppSidebar } from "@/features/app/AppSidebar.tsx";
import { LoginPage } from "@/features/app/LoginWidget.tsx";
import { SelectClientPage } from "@/features/app/SelectClientPage.tsx";
import { BillingWidget } from "@/features/billing/BillingWidget.tsx";
import { CostEditModalWidget } from "@/features/costs/CostEditModalWidget.tsx";
import { CostWidget } from "@/features/costs/CostWidget.tsx";
import { PotentialCostWidget } from "@/features/costs/PotentialCostWidget.tsx";
import { Dashboard } from "@/features/dashboard/Dashboard.tsx";
import { ReportEditModalWidget } from "@/features/reports/ReportEditModalWidget.tsx";
import { ReportsWidget } from "@/features/reports/ReportsWidget.tsx";
import { VariableEditModalWidget } from "@/features/variables/VariableEditModalWidget.tsx";
import { VariableWidget } from "@/features/variables/VariableWidget.tsx";
import { Layout } from "@/layout/AppLayout.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import {
  ClientSpec,
  WithRoutingService,
  WorkspaceSpec,
} from "@/services/front/RoutingService/RoutingService.ts";
import { WithLocationService } from "@/services/internal/LocationService/LocationService.ts";
import { WithMessageService } from "@/services/internal/MessageService/MessageService.ts";
import { WithNavigationService } from "@/services/internal/NavigationService/NavigationService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithAuthService } from "@/services/io/AuthService/AuthService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithCostService } from "@/services/io/CostService/CostService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithReportService } from "@/services/io/ReportService/ReportService";
import { WithVariableService } from "@/services/io/VariableService/VariableService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe } from "@passionware/monads";
import { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";

function IdResolver(
  props: WithServices<[WithLocationService]> & {
    children: (workspaceId: WorkspaceSpec, clientId: ClientSpec) => ReactNode;
  },
) {
  const clientId = props.services.locationService.useCurrentClientId();
  const workspaceId = props.services.locationService.useCurrentWorkspaceId();
  return props.children(
    maybe.getOrThrow(workspaceId, "No workspace ID"),
    maybe.getOrThrow(clientId, "No client ID"),
  );
}

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
      </Routes>
      <RenderIfAuthenticated services={props.services}>
        <VariableEditModalWidget services={props.services} />
        <ReportEditModalWidget services={props.services} />
        <CostEditModalWidget services={props.services} />
      </RenderIfAuthenticated>
    </>
  );
}
