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
      <div className="dark contents">{sidebarSlot}</div>
      <SidebarInset className="h-screen">{children}</SidebarInset>
    </SidebarProvider>
  );
}
