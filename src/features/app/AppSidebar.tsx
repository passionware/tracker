import { clientQueryUtils } from "@/api/clients/clients.api.ts";
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
import { MergeServices, WithServices } from "@/platform/typescript/services.ts";
import { WithRoutingService } from "@/services/front/RoutingService/RoutingService.ts";
import { WithLocationService } from "@/services/internal/LocationService/LocationService.ts";
import { WithAuthService } from "@/services/io/AuthService/AuthService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { maybe, rd } from "@passionware/monads";
import {
  BookOpen,
  Building2,
  Frame,
  HardHat,
  Map,
  PieChart,
  Settings2,
} from "lucide-react";
import { ComponentProps, useMemo } from "react";

// This is sample data.
function useData(
  services: MergeServices<[WithLocationService, WithRoutingService]>,
) {
  const currentClientId = services.locationService.useCurrentClientId();

  return useMemo(() => {
    const routing = services.routingService.forClient(currentClientId);
    return {
      navMain: [
        {
          title: "Client",
          url: "#",
          icon: Building2,
          isActive: true,
          items: [
            {
              title: "Reports",
              url: routing.reports(),
            },
            {
              title: "Income invoices",
              url: routing.invoices(),
            },
          ],
        },
        {
          title: "Contractor",
          url: "#",
          icon: HardHat,
          items: [
            {
              title: "Reports",
              url: "#",
            },
            {
              title: "Cost invoices",
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
          name: "Contractor reports",
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
  }, [currentClientId]);
}

export function AppSidebar({
  services,
  ...props
}: WithServices<
  [WithAuthService, WithClientService, WithLocationService, WithRoutingService]
> &
  ComponentProps<typeof Sidebar>) {
  const auth = services.authService.useAuth();
  const clients = services.clientService.useClients(clientQueryUtils.ofEmpty());
  const currentClientId = services.locationService.useCurrentClientId();
  const data = useData(services);
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {maybe.map(currentClientId, (currentClientId) =>
          rd
            .journey(clients)
            .wait(<Skeleton className="w-20 h-4" />)
            .catch(renderError)
            .map((clients) => (
              <TeamSwitcher
                clients={clients}
                activeClient={currentClientId}
                onClientSwitch={services.locationService.changeCurrentClientId}
              />
            )),
        )}
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
