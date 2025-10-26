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
import { getInitials } from "@/platform/lang/getInitials.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import {
  CockpitAuthInfo,
  WithCockpitAuthService,
} from "@/services/io/CockpitAuthService/CockpitAuthService.ts";
import { maybe } from "@passionware/monads";
import { ChevronsUpDown, LogOut } from "lucide-react";

export function CockpitNavUser({
  info,
  services,
}: { info: CockpitAuthInfo } & WithServices<[WithCockpitAuthService]>) {
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
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
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
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={services.cockpitAuthService.logout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
