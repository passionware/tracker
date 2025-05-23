import { clientQueryUtils } from "@/api/clients/clients.api.ts";
import { workspaceQueryUtils } from "@/api/workspace/workspace.api.ts";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { myQueryClient } from "@/core/query.connected.ts";
import { renderError } from "@/features/_common/renderError.tsx";
import { ClientSwitcher } from "@/features/app/ClientSwitcher.tsx";

import { NavMain } from "@/features/app/nav-main.tsx";
import { NavProjects } from "@/features/app/nav-projects.tsx";
import { NavUser } from "@/features/app/nav-user.tsx";
import { WorkspaceSwitcher } from "@/features/app/WorkspaceSwitcher.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { MergeServices, WithServices } from "@/platform/typescript/services.ts";
import { WithRoutingService } from "@/services/front/RoutingService/RoutingService.ts";
import { WithLocationService } from "@/services/internal/LocationService/LocationService.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import { WithAuthService } from "@/services/io/AuthService/AuthService.ts";
import { WithClientService } from "@/services/io/ClientService/ClientService.ts";
import { WithWorkspaceService } from "@/services/WorkspaceService/WorkspaceService.ts";
import { maybe, rd } from "@passionware/monads";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  AudioLines,
  BriefcaseBusiness,
  Frame,
  HandCoins,
  HardHat,
  Leaf,
  PieChart,
} from "lucide-react";
import { ComponentProps, useMemo } from "react";

// This is sample data.
function useData(
  services: MergeServices<[WithLocationService, WithRoutingService]>,
) {
  const currentClientId = services.locationService.useCurrentClientId();
  const currentWorkspaceId = services.locationService.useCurrentWorkspaceId();

  return useMemo(() => {
    const routing = services.routingService
      .forWorkspace(currentWorkspaceId ?? idSpecUtils.ofAll())
      .forClient(currentClientId ?? idSpecUtils.ofAll());
    return {
      navMain: [
        {
          title: "Projects",
          url: routing.projectsRoot(),
          icon: BriefcaseBusiness,
          items: [
            {
              title: "Active projects",
              url: routing.activeProjects(),
            },
            {
              title: "All projects",
              url: routing.allProjects(),
            },
            {
              title: "Closed projects",
              url: routing.closedProjects(),
            },
          ],
        },
        {
          title: "Cash flow",
          url: routing.flowRoot(),
          icon: HandCoins,
          items: [
            {
              title: "Work Reports",
              url: routing.reports(),
            },
            {
              title: "Client Charges",
              url: routing.charges(),
            },
            {
              title: "Matched costs",
              url: routing.costs(),
            },
            {
              title: "Relevant costs",
              url: routing.potentialCosts(),
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
          title: "Environment",
          url: routing.environmentRoot(),
          icon: Leaf,
          items: [
            {
              title: "Variables",
              url: routing.variables(),
            },
            // {
            //   title: "Get Started",
            //   url: "#",
            // },
            // {
            //   title: "Tutorials",
            //   url: "#",
            // },
            // {
            //   title: "Changelog",
            //   url: "#",
            // },
          ],
        },
        // {
        //   title: "Settings",
        //   url: "#",
        //   icon: Settings2,
        //   items: [
        //     {
        //       title: "General",
        //       url: "#",
        //     },
        //     {
        //       title: "Team",
        //       url: "#",
        //     },
        //     {
        //       title: "Billing",
        //       url: "#",
        //     },
        //     {
        //       title: "Limits",
        //       url: "#",
        //     },
        //   ],
        // },
      ],
      projects: [
        {
          name: "Time tracking",
          url: "#",
          icon: AudioLines,
        },
        {
          name: "Client cockpit",
          url: "#",
          icon: PieChart,
        },
        {
          name: "Display settings",
          url: "#",
          icon: Frame,
        },
      ],
    };
  }, [currentClientId, currentWorkspaceId]);
}

export function AppSidebar({
  services,
  ...props
}: WithServices<
  [
    WithAuthService,
    WithClientService,
    WithLocationService,
    WithRoutingService,
    WithPreferenceService,
    WithWorkspaceService,
  ]
> &
  ComponentProps<typeof Sidebar>) {
  const auth = services.authService.useAuth();
  const clients = services.clientService.useClients(clientQueryUtils.ofEmpty());
  const workspaces = services.workspaceService.useWorkspaces(
    workspaceQueryUtils.ofEmpty(),
  );
  const currentClientId =
    services.locationService.useCurrentClientId() ?? idSpecUtils.ofAll();
  const currentWorkspaceId =
    services.locationService.useCurrentWorkspaceId() ?? idSpecUtils.ofAll();
  const data = useData(services);
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {maybe.map(currentWorkspaceId, (currentWorkspaceId) =>
          rd
            .journey(workspaces)
            .wait(<Skeleton className="w-full h-[3.63rem]" />)
            .catch(renderError)
            .map((workspaces) => (
              <WorkspaceSwitcher
                workspaces={workspaces}
                activeWorkspace={currentWorkspaceId}
                onWorkspaceSwitch={
                  services.locationService.changeCurrentWorkspaceId
                }
              />
            )),
        )}
        {maybe.map(currentClientId, (currentClientId) =>
          rd
            .journey(clients)
            .wait(<Skeleton className="w-full h-[3.63rem]" />)
            .catch(renderError)
            .map((clients) => (
              <ClientSwitcher
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
        <div className="[&_.tsqd-open-btn-container]:scale-75 w-min">
          <ReactQueryDevtools
            client={myQueryClient}
            buttonPosition="relative"
          />
        </div>
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
