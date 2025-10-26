"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { getInitials } from "@/platform/lang/getInitials.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import {
  CockpitAuthInfo,
  WithCockpitAuthService,
} from "@/services/io/CockpitAuthService/CockpitAuthService.ts";
import { WithAuthService } from "@/services/io/AuthService/AuthService.ts";
import { maybe } from "@passionware/monads";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { WithRoutingService } from "@/services/front/RoutingService/RoutingService.ts";
import { PortalAccessSection } from "@/features/_common/PortalAccessSection.tsx";

export function CockpitNavUser({
  info,
  services,
}: { info: CockpitAuthInfo } & WithServices<
  [WithCockpitAuthService, WithAuthService, WithRoutingService]
>) {
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {maybe.map(info.avatarUrl, (url) => (
                  <AvatarImage src={url} alt={info.displayName} />
                ))}
                <AvatarFallback className="rounded-lg">
                  {getInitials(info.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {info.displayName}
                </span>
                {maybe.map(info.email, (email) => (
                  <span className="truncate text-xs">{email}</span>
                ))}
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-80 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* Current Cockpit User */}
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-3 py-2.5 text-left text-sm">
                <Avatar className="h-10 w-10 rounded-lg ring-2 ring-blue-500">
                  {maybe.map(info.avatarUrl, (url) => (
                    <AvatarImage src={url} alt={info.displayName} />
                  ))}
                  <AvatarFallback className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    {getInitials(info.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="truncate font-semibold text-base">
                      {info.displayName}
                    </span>
                    <Badge className="text-xs bg-blue-50 text-blue-700 border border-blue-200">
                      Active
                    </Badge>
                  </div>
                  {maybe.map(info.email, (email) => (
                    <span className="truncate text-xs text-muted-foreground block">
                      {email}
                    </span>
                  ))}
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <PortalAccessSection
              services={services}
              currentPortal="cockpit"
              currentUserEmail={maybe.map(info.email, (e) => e) ?? undefined}
            />

            <DropdownMenuSeparator />

            {/* Logout */}
            <DropdownMenuItem
              onClick={services.cockpitAuthService.logout}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut />
              Logout from Cockpit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
