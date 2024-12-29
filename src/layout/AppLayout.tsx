import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ReactNode } from "react";

export function Layout({
  children,
  sidebarSlot,
}: {
  sidebarSlot: ReactNode;
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      {sidebarSlot}
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
