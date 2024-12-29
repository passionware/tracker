import { AppSidebar } from "@/features/app/AppSidebar.tsx";
import { DummyPage } from "@/features/app/DummyPage.tsx";
import { Layout } from "@/layout/AppLayout.tsx";

export function RootWidget() {
  return (
    <Layout sidebarSlot={<AppSidebar />}>
      <DummyPage />
    </Layout>
  );
}
