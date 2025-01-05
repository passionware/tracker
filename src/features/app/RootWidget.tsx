import { ProtectedRoute } from "@/features/_common/ProtectedRoute.tsx";
import { AppSidebar } from "@/features/app/AppSidebar.tsx";
import { DummyPage } from "@/features/app/DummyPage.tsx";
import { LoginPage } from "@/features/app/LoginWidget.tsx";
import { BillingWidget } from "@/features/billing/BillingWidget.tsx";
import { ContractorReportsWidget } from "@/features/contractor-reports/ContractorReportsWidget.tsx";
import { Layout } from "@/layout/AppLayout.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithFormatService } from "@/services/FormatService/FormatService.ts";
import { WithReportDisplayService } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { WithRoutingService } from "@/services/front/RoutingService/RoutingService.ts";
import { WithLocationService } from "@/services/internal/LocationService/LocationService.ts";
import { WithAuthService } from "@/services/io/AuthService/AuthService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { maybe } from "@passionware/monads";
import { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";

function ClientIdResolver(
  props: WithServices<[WithLocationService]> & {
    children: (clientId: number) => ReactNode;
  },
) {
  const clientId = props.services.locationService.useCurrentClientId();
  return props.children(maybe.getOrThrow(clientId, "No client ID"));
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
    ]
  >,
) {
  return (
    <Routes>
      <Route
        path="*"
        element={
          <ProtectedRoute services={props.services}>
            <Layout sidebarSlot={<AppSidebar services={props.services} />}>
              <DummyPage services={props.services} />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<LoginPage services={props.services} />} />
      <Route
        path={props.services.routingService.forClient().reports()}
        element={
          <ProtectedRoute services={props.services}>
            <Layout sidebarSlot={<AppSidebar services={props.services} />}>
              <ClientIdResolver services={props.services}>
                {(clientId) => (
                  <ContractorReportsWidget
                    clientId={clientId}
                    services={props.services}
                  />
                )}
              </ClientIdResolver>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path={props.services.routingService.forClient().billing()}
        element={
          <ProtectedRoute services={props.services}>
            <Layout sidebarSlot={<AppSidebar services={props.services} />}>
              <ClientIdResolver services={props.services}>
                {(clientId) => (
                  <BillingWidget
                    clientId={clientId}
                    services={props.services}
                  />
                )}
              </ClientIdResolver>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
