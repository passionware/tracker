import { AppSidebar } from "@/features/app/AppSidebar.tsx";
import { Layout } from "@/layout/AppLayout.tsx";

export function RootWidget() {
  return <Layout sidebarSlot={<AppSidebar />}>Hello app</Layout>;
}
