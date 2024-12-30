import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { renderError } from "@/features/_common/renderError.tsx";

import { NavMain } from "@/features/app/nav-main.tsx";
import { NavProjects } from "@/features/app/nav-projects.tsx";
import { NavUser } from "@/features/app/nav-user.tsx";
import { TeamSwitcher } from "@/features/app/team-switcher.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithAuthService } from "@/services/AuthService/AuthService.ts";
import { WithClientService } from "@/services/ClientService/ClientService.ts";
import { rd } from "@passionware/monads";
import {
  BookOpen,
  Bot,
  Frame,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react";
import { ComponentProps } from "react";

// This is sample data.
const data = {
  navMain: [
    {
      title: "For client",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Reported hours",
          url: "/clients/1/reports",
        },
        {
          title: "Billing",
          url: "/billing",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
    {
      title: "Models",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Genesis",
          url: "#",
        },
        {
          title: "Explorer",
          url: "#",
        },
        {
          title: "Quantum",
          url: "#",
        },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
};

export function AppSidebar({
  services,
  ...props
}: WithServices<[WithAuthService, WithClientService]> &
  ComponentProps<typeof Sidebar>) {
  const auth = services.authService.useAuth();
  const clients = services.clientService.useClients();
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {rd
          .journey(clients)
          .wait(<Skeleton className="w-20 h-4" />)
          .catch(renderError)
          .map((clients) => (
            <TeamSwitcher clients={clients} />
          ))}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        {rd
          .journey(auth)
          .wait(<Skeleton className="w-20 h-4" />)
          .catch(() => null)
          .map((auth) => (
            <NavUser info={auth} services={services} />
          ))}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
