import { ProtectedRoute } from "@/features/_common/ProtectedRoute.tsx";
import { AppSidebar } from "@/features/app/AppSidebar.tsx";
import { LoginPage } from "@/features/app/LoginWidget.tsx";
import { SelectClientPage } from "@/features/app/SelectClientPage.tsx";
import { BillingWidget } from "@/features/billing/BillingWidget.tsx";
import { ContractorReportsWidget } from "@/features/contractor-reports/ContractorReportsWidget.tsx";
import { CostsWidget } from "@/features/costs/CostsWidget.tsx";
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
import { WithNavigationService } from "@/services/internal/NavigationService/NavigationService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithAuthService } from "@/services/io/AuthService/AuthService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithContractorService } from "@/services/io/ContractorService/ContractorService.ts";
import { WithCostService } from "@/services/io/CostService/CostService.ts";
import { WithMutationService } from "@/services/io/MutationService/MutationService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe } from "@passionware/monads";
import { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";

function ClientIdResolver(
  props: WithServices<[WithLocationService]> & {
    children: (clientId: ClientSpec, workspaceId: WorkspaceSpec) => ReactNode;
  },
) {
  const clientId = props.services.locationService.useCurrentClientId();
  const workspaceId = props.services.locationService.useCurrentWorkspaceId();
  return props.children(
    maybe.getOrThrow(clientId, "No client ID"),
    maybe.getOrThrow(workspaceId, "No workspace ID"),
  );
}

function WorkspaceIdResolver(
  props: WithServices<[WithLocationService]> & {
    children: (workspaceId: WorkspaceSpec) => ReactNode;
  },
) {
  const workspaceId = props.services.locationService.useCurrentWorkspaceId();
  return props.children(maybe.getOrThrow(workspaceId, "No workspace ID"));
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
    ]
  >,
) {
  return (
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
      <Route path="/login" element={<LoginPage services={props.services} />} />
      <Route
        path={props.services.routingService.forWorkspace().forClient().root()}
        element={
          <ProtectedRoute services={props.services}>
            <Layout sidebarSlot={<AppSidebar services={props.services} />}>
              "Welcome to client dashboard"
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
              <ClientIdResolver services={props.services}>
                {(clientId, workspaceId) => (
                  <ContractorReportsWidget
                    clientId={clientId}
                    workspaceId={workspaceId}
                    services={props.services}
                  />
                )}
              </ClientIdResolver>
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
              <ClientIdResolver services={props.services}>
                {(clientId, workspaceId) => (
                  <BillingWidget
                    clientId={clientId}
                    workspaceId={workspaceId}
                    services={props.services}
                  />
                )}
              </ClientIdResolver>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path={props.services.routingService.forWorkspace().forClient().costs()}
        element={
          <ProtectedRoute services={props.services}>
            <Layout sidebarSlot={<AppSidebar services={props.services} />}>
              <WorkspaceIdResolver services={props.services}>
                {(workspaceId) => (
                  <CostsWidget
                    workspaceId={workspaceId}
                    services={props.services}
                  />
                )}
              </WorkspaceIdResolver>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
