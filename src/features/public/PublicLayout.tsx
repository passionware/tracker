import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ReactNode } from "react";
import { PublicSidebar } from "./PublicSidebar";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="dark contents">
        <PublicSidebar />
      </div>
      <SidebarInset className="h-screen">{children}</SidebarInset>
    </SidebarProvider>
  );
}
