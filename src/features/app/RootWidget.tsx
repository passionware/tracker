import { ProtectedRoute } from "@/features/_common/ProtectedRoute.tsx";
import { AppSidebar } from "@/features/app/AppSidebar.tsx";
import { DummyPage } from "@/features/app/DummyPage.tsx";
import { Layout } from "@/layout/AppLayout.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithAuthService } from "@/services/AuthService/AuthService.ts";

export function RootWidget(props: WithServices<[WithAuthService]>) {
  return (
    <ProtectedRoute services={props.services}>
      <Layout sidebarSlot={<AppSidebar />}>
        <DummyPage services={props.services} />
      </Layout>
    </ProtectedRoute>
  );
}
