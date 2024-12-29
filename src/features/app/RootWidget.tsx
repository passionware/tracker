import { AppSidebar } from "@/features/app/AppSidebar.tsx";
import { DummyPage } from "@/features/app/DummyPage.tsx";
import { Layout } from "@/layout/AppLayout.tsx";
import { Services } from "@/platform/typescript/services.ts";
import { WithAuthService } from "@/services/AuthService/AuthService.ts";

export function RootWidget(props: Services<[WithAuthService]>) {
  return (
    <Layout sidebarSlot={<AppSidebar />}>
      <DummyPage services={props.services} />
    </Layout>
  );
}
