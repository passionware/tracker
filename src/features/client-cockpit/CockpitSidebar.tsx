import { myRouting } from "@/routing/myRouting.ts";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
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
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithAuthService } from "@/services/io/AuthService/AuthService.ts";
import { WithCockpitAuthService } from "@/services/io/CockpitAuthService/CockpitAuthService.ts";
import { WithCockpitTenantService } from "@/services/cockpit/CockpitTenantService/CockpitTenantService.ts";
import { maybe, rd } from "@passionware/monads";
import { Briefcase, Building2, FileText, Home } from "lucide-react";
import { ComponentProps, Fragment } from "react";
import { Link, matchPath, useLocation } from "react-router-dom";
import { SidebarDevDatabaseBanner } from "@/features/_common/patterns/SidebarDevDatabaseBanner.tsx";
import { CockpitNavUser } from "./CockpitNavUser";

export function CockpitSidebar({
  services,
  ...props
}: WithServices<
  [
    WithCockpitAuthService,
    WithAuthService,
    WithCockpitTenantService,
  ]
> &
  ComponentProps<typeof Sidebar>) {
  const cockpitAuth = services.cockpitAuthService.useAuth();
  const mainAppAuth = services.authService.useAuth();
  const location = useLocation();

  // Get tenant information
  const tenantId = rd.tryMap(cockpitAuth, (auth) => auth.tenantId);
  const tenant = services.cockpitTenantService.useTenant(tenantId);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {rd
          .journey(tenant)
          .wait(
            <div className="flex items-center gap-2 px-2 py-2">
              <Skeleton className="h-6 w-6 rounded-sm" />
              <Skeleton className="h-4 w-24" />
            </div>,
          )
          .catch(() => (
            <div className="flex items-center gap-2 px-4 py-2">
              <Building2 className="h-6 w-6" />
              <span className="font-semibold">Client Portal</span>
            </div>
          ))
          .map((tenantInfo) => {
            const reportsUrl = myRouting
              .forClientCockpit()
              .forClient(tenantInfo.id)
              .reports();
            return (
              <SidebarMenu key={tenantInfo.id}>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    size="lg"
                    asChild
                    className="rounded-xl py-7"
                    tooltip={{ children: tenantInfo.name }}
                  >
                    <Link to={reportsUrl}>
                      <Avatar
                        className="size-8 shrink-0 rounded-md bg-sidebar-primary dark:bg-sidebar-accent"
                        key={tenantInfo.clientLogoUrl ?? tenantInfo.updatedAt}
                      >
                        {tenantInfo.clientLogoUrl ? (
                          <AvatarImage
                            src={tenantInfo.clientLogoUrl}
                            alt=""
                            className="rounded-md object-contain"
                          />
                        ) : null}
                        <AvatarFallback className="rounded-md bg-slate-600 text-sidebar-primary-foreground">
                          <Building2 className="size-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                        <span className="truncate font-semibold">
                          {tenantInfo.name}
                        </span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            );
          })}
      </SidebarHeader>
      <SidebarContent>
        {rd.tryMap(cockpitAuth, (authInfo) => (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarMenu>
                {maybe.map(authInfo.tenantId, (tenantId) => {
                  const reportsUrl = myRouting
                    .forClientCockpit()
                    .forClient(tenantId)
                    .reports();

                  return (
                    <Fragment key={tenantId}>
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
                    </Fragment>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>

            {authInfo.role === "admin" && authInfo.tenantId ? (
              <SidebarGroup>
                <SidebarGroupLabel>Settings</SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        matchPath(
                          myRouting
                            .forClientCockpit()
                            .forClient(authInfo.tenantId)
                            .portalClientSettings(),
                          location.pathname,
                        ) !== null
                      }
                    >
                      <Link
                        to={myRouting
                          .forClientCockpit()
                          .forClient(authInfo.tenantId)
                          .portalClientSettings()}
                      >
                        <Building2 />
                        <span>Client</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        matchPath(
                          myRouting
                            .forClientCockpit()
                            .forClient(authInfo.tenantId)
                            .portalProviderSettings(),
                          location.pathname,
                        ) !== null
                      }
                    >
                      <Link
                        to={myRouting
                          .forClientCockpit()
                          .forClient(authInfo.tenantId)
                          .portalProviderSettings()}
                      >
                        <Briefcase />
                        <span>Provider</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            ) : null}

            {/* Show link to main app if user is also logged in there */}
            {rd.isSuccess(mainAppAuth) && (
              <SidebarGroup>
                <SidebarGroupLabel>Switch Portal</SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link to={myRouting.forGlobal().root()}>
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
        <SidebarDevDatabaseBanner />
        {rd
          .journey(cockpitAuth)
          .wait(<Skeleton className="w-20 h-4" />)
          .catch(() => null)
          .map((authInfo) => (
            <CockpitNavUser info={authInfo} services={services} />
          ))}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
