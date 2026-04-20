import { myRouting } from "@/routing/myRouting.ts";
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
import { SidebarDevDatabaseBanner } from "@/features/_common/patterns/SidebarDevDatabaseBanner.tsx";
import { renderError } from "@/features/_common/renderError.tsx";
import { ClientSwitcher } from "@/features/app/ClientSwitcher.tsx";

import { NavMain } from "@/features/app/nav-main.tsx";
import { NavProjects } from "@/features/app/nav-projects.tsx";
import { NavUser } from "@/features/app/nav-user.tsx";
import { WorkspaceSwitcher } from "@/features/app/WorkspaceSwitcher.tsx";
import { TmetricLiveContractorsPopover } from "@/features/tmetric-dashboard/TmetricLiveContractorsPopover.tsx";
import { deriveAdminScope } from "@/features/time-tracking/TimeTrackingApprovalsPage.tsx";
import { TrackerBar } from "@/features/time-tracking/tracker-bar/TrackerBar.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { MergeServices } from "@/platform/typescript/services.ts";
import { WithFrontServices } from "@/core/frontServices.ts";
import { WithLocationService } from "@/services/internal/LocationService/LocationService.ts";
import { maybe, rd } from "@passionware/monads";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  AudioLines,
  BriefcaseBusiness,
  Clock,
  Grid3X3,
  HandCoins,
  Leaf,
  PieChart,
  Timer,
} from "lucide-react";
import { ComponentProps, useMemo } from "react";

// This is sample data.
function useData(
  services: MergeServices<[WithLocationService]>,
  options: { canReviewApprovals: boolean },
) {
  const currentClientId = services.locationService.useCurrentClientId();
  const currentWorkspaceId = services.locationService.useCurrentWorkspaceId();
  const { canReviewApprovals } = options;

  return useMemo(() => {
    const routing = myRouting
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
              title: "Timeline",
              url: routing.projectsTimeline(),
            },
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
          title: "Time tracking",
          url: routing.timeTrackingRoot(),
          icon: Clock,
          items: [
            {
              title: "My time",
              url: routing.timeTrackingMine(),
            },
            {
              title: "Timeline",
              url: routing.timeTrackingTimeline(),
            },
            {
              title: "Tasks",
              url: routing.timeTrackingTasks(),
            },
            {
              title: "Activities",
              url: routing.timeTrackingActivities(),
            },
            ...(canReviewApprovals
              ? [
                  {
                    title: "Approvals",
                    url: routing.timeTrackingApprovals(),
                  },
                ]
              : []),
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
          title: "Environment",
          url: routing.environmentRoot(),
          icon: Leaf,
          items: [
            {
              title: "Variables",
              url: routing.variables(),
            },
            {
              title: "Clients",
              url: myRouting.forGlobal().manageClients(),
            },
            {
              title: "Workspaces",
              url: myRouting.forGlobal().manageWorkspaces(),
            },
            {
              title: "Contractors",
              url: myRouting.forGlobal().manageContractors(),
            },
            {
              title: "Project rates",
              url: myRouting.forGlobal().manageProjectRates(),
            },
            {
              title: "TMetric backfill",
              url: myRouting.forGlobal().tmetricBackfill(),
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
          name: "TMetric live",
          url: myRouting.forGlobal().tmetricLiveContractors(),
          icon: Timer,
        },
        {
          name: "TMetric dashboard",
          url: routing.tmetricDashboard(),
          icon: AudioLines,
        },
        {
          name: "Cube explorer",
          url: routing.tmetricDashboardCube(),
          icon: Grid3X3,
        },
        {
          name: "Client cockpit",
          url: myRouting.forClientCockpit().root(),
          icon: PieChart,
        },
      ],
    };
  }, [currentClientId, currentWorkspaceId, canReviewApprovals]);
}

export function AppSidebar({
  services,
  ...props
}: WithFrontServices & ComponentProps<typeof Sidebar>) {
  const auth = services.authService.useAuth();
  const clients = services.clientService.useClients(clientQueryUtils.ofDefault());
  const workspaces = services.workspaceService.useWorkspaces(
    workspaceQueryUtils.ofDefault(),
  );
  const currentClientId =
    services.locationService.useCurrentClientId() ?? idSpecUtils.ofAll();
  const currentWorkspaceId =
    services.locationService.useCurrentWorkspaceId() ?? idSpecUtils.ofAll();
  const authInfo = rd.tryGet(auth);
  const rolesRd = services.timeRoleService.useMyRoles(authInfo?.id ?? null);
  const canReviewApprovals = useMemo(() => {
    const roles = rd.tryGet(rolesRd);
    if (!roles) return false;
    return deriveAdminScope(roles).kind !== "none";
  }, [rolesRd]);
  const data = useData(services, { canReviewApprovals });
  const sidebarNavExpansion = services.preferenceService.useAppSidebarNavExpansion();
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
        <NavMain
          items={data.navMain}
          sidebarNavExpansion={sidebarNavExpansion}
        />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <div className="[&_.tsqd-open-btn-container]:scale-75 w-min">
          <ReactQueryDevtools
            client={myQueryClient}
            buttonPosition="relative"
          />
        </div>
        <SidebarDevDatabaseBanner />
        <TmetricLiveContractorsPopover services={services} />
        <TrackerBar services={services} />
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
