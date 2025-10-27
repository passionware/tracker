import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar.tsx";
import { NavMain } from "@/features/app/nav-main.tsx";
import { FileText, Upload } from "lucide-react";
import { ComponentProps } from "react";

// Public navigation data
function usePublicData() {
  return {
    navMain: [
      {
        title: "Report Explorer",
        url: "/p/explorer",
        icon: FileText,
        items: [
          {
            title: "Upload Reports",
            url: "/p/explorer/upload",
          },
          {
            title: "View Reports",
            url: "/p/explorer/reports",
          },
        ],
      },
    ],
  };
}

export function PublicSidebar(props: ComponentProps<typeof Sidebar>) {
  const data = usePublicData();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <Upload className="h-6 w-6" />
          <span className="font-semibold">Public Reports</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <div className="px-4 py-2 text-sm text-muted-foreground">
          Public Report Explorer
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
