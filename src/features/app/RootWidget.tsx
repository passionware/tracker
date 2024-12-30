import { ProtectedRoute } from "@/features/_common/ProtectedRoute.tsx";
import { AppSidebar } from "@/features/app/AppSidebar.tsx";
import { DummyPage } from "@/features/app/DummyPage.tsx";
import { LoginPage } from "@/features/app/LoginWidget.tsx";
import { Layout } from "@/layout/AppLayout.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithAuthService } from "@/services/AuthService/AuthService.ts";
import { WithClientService } from "@/services/ClientService/ClientService.ts";
import { Route, Routes } from "react-router-dom";

export function RootWidget(
  props: WithServices<[WithAuthService, WithClientService]>,
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
    </Routes>
  );
}
