import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithRoutingService } from "@/services/front/RoutingService/RoutingService.ts";
import { WithAuthService } from "@/services/io/AuthService/AuthService.ts";
import { WithCockpitAuthService } from "@/services/io/CockpitAuthService/CockpitAuthService.ts";
import { maybe, rd } from "@passionware/monads";
import { Building2, FileText, Home } from "lucide-react";
import { ComponentProps } from "react";
import { Link, matchPath, useLocation } from "react-router-dom";
import { CockpitNavUser } from "./CockpitNavUser";

export function CockpitSidebar({
  services,
  ...props
}: WithServices<[WithCockpitAuthService, WithAuthService, WithRoutingService]> &
  ComponentProps<typeof Sidebar>) {
  const cockpitAuth = services.cockpitAuthService.useAuth();
  const mainAppAuth = services.authService.useAuth();
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <Building2 className="h-6 w-6" />
          <span className="font-semibold">Client Portal</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {rd.tryMap(cockpitAuth, (authInfo) => (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarMenu>
                {maybe.map(authInfo.tenantId, (tenantId) => {
                  const reportsUrl = services.routingService
                    .forClientCockpit()
                    .forClient(tenantId)
                    .reports();

                  return (
                    <SidebarMenuItem key="reports">
                      <SidebarMenuButton
                        asChild
                        isActive={
                          matchPath(reportsUrl + "/*", location.pathname) !==
                            null ||
                          matchPath(reportsUrl, location.pathname) !== null
                        }
                      >
                        <Link to={reportsUrl}>
                          <FileText />
                          <span>Reports</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>

            {/* Show link to main app if user is also logged in there */}
            {rd.isSuccess(mainAppAuth) && (
              <SidebarGroup>
                <SidebarGroupLabel>Switch Portal</SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link to={services.routingService.forGlobal().root()}>
                        <Home />
                        <span>Main App</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            )}
          </>
        ))}
      </SidebarContent>
      <SidebarFooter>
        {rd.tryMap(cockpitAuth, (authInfo) => (
          <CockpitNavUser info={authInfo} services={services} />
        ))}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
