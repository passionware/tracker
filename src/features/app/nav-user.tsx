"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge.tsx";
import { getInitials } from "@/platform/lang/getInitials.ts";
import { WithServices } from "@/platform/typescript/services.ts";
import { WithPreferenceService } from "@/services/internal/PreferenceService/PreferenceService.ts";
import {
  AuthInfo,
  WithAuthService,
} from "@/services/io/AuthService/AuthService.ts";
import { WithCockpitAuthService } from "@/services/io/CockpitAuthService/CockpitAuthService.ts";
import { WithRoutingService } from "@/services/front/RoutingService/RoutingService.ts";
import {
  BadgeCheck,
  ChevronsUpDown,
  Construction,
  CreditCard,
  LogOut,
  Sparkles,
} from "lucide-react";
import { PortalAccessSection } from "@/features/_common/PortalAccessSection.tsx";

export function NavUser({
  info,
  services,
}: { info: AuthInfo } & WithServices<
  [
    WithAuthService,
    WithPreferenceService,
    WithCockpitAuthService,
    WithRoutingService,
  ]
>) {
  const { isMobile } = useSidebar();

  const isDangerMode = services.preferenceService.useIsDangerMode();
  const handleDangerModeChange = () => {
    services.preferenceService.setIsDangerMode(!isDangerMode);
  };

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
                {info.avatarUrl ? (
                  <AvatarImage src={info.avatarUrl} alt={info.displayName} />
                ) : null}
                <AvatarFallback className="rounded-lg">
                  {getInitials(info.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {info.displayName}
                </span>
                <span className="truncate text-xs">{info.email}</span>
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
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-3 py-2.5 text-left text-sm">
                <Avatar className="h-10 w-10 rounded-lg ring-2 ring-slate-500">
                  {info.avatarUrl ? (
                    <AvatarImage src={info.avatarUrl} alt={info.displayName} />
                  ) : null}
                  <AvatarFallback className="rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 text-white">
                    {getInitials(info.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="truncate font-semibold text-base">
                      {info.displayName}
                    </span>
                    <Badge className="text-xs bg-green-50 text-green-700 border border-green-200">
                      Active
                    </Badge>
                  </div>
                  <span className="truncate text-xs text-muted-foreground block">
                    {info.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <PortalAccessSection
              services={services}
              currentPortal="tracker"
              currentUserEmail={info.email ?? undefined}
            />

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Sparkles />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BadgeCheck />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleDangerModeChange();
                }}
                className={
                  isDangerMode ? "text-red-700 focus:text-red-600" : ""
                }
              >
                <Construction />
                Destruction mode
                <Switch
                  checked={isDangerMode}
                  onCheckedChange={handleDangerModeChange}
                  variant={isDangerMode ? "danger" : "normal"}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  className="ml-auto"
                />
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={services.authService.logout}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut />
              Logout from Tracker
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
