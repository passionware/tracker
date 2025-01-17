import { Client } from "@/api/clients/clients.api.ts";
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
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar.tsx";
import { OverflowTooltip } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";
import { getInitials } from "@/platform/lang/getInitials.ts";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { ClientSpec } from "@/services/front/RoutingService/RoutingService.ts";
import { ChevronsUpDown, Plus, Users } from "lucide-react";

export type ClientSwitcherProps = {
  clients: Client[];
  activeClient: ClientSpec;
  onClientSwitch: (client: ClientSpec) => void;
};

export function ClientSwitcher({
  clients,
  onClientSwitch,
  activeClient,
}: ClientSwitcherProps) {
  const { isMobile } = useSidebar();

  if (clients.length === 0) {
    console.error("No clients found");
  }

  const activeItem = idSpecUtils.isAll(activeClient)
    ? activeClient
    : clients.find((client) => client.id === activeClient);
  const allClasses =
    "bg-gradient-to-tl from-pink-500 to-amber-300 text-white rounded-none";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="rounded-xl py-7 border border-sky-900/10 bg-gradient-to-tl from-rose-300/5 to-blue-500/5 outline-none focus-visible:ring-2 focus:ring-rose-500/20"
            >
              {activeItem ? (
                idSpecUtils.isAll(activeItem) ? (
                  <>
                    <Avatar asChild>
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <AvatarFallback
                          className={cn(
                            "rounded-none text-white bg-gradient-to-tl",
                            allClasses,
                          )}
                        >
                          <Users />
                        </AvatarFallback>
                      </div>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        All clients
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <Avatar
                      asChild
                      key={
                        activeItem.avatarUrl /* Remount Avatar if conditional rendering issues occur */
                      }
                    >
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        {activeItem.avatarUrl && (
                          <AvatarImage
                            src={activeItem.avatarUrl}
                            alt={activeItem.name}
                          />
                        )}
                        <AvatarFallback className="rounded-none bg-slate-600">
                          {getInitials(activeItem.name)}
                        </AvatarFallback>
                      </div>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="text-slate-500 text-xs truncate font-light">
                        Client
                      </span>
                      <OverflowTooltip title={activeItem.name}>
                        <span className="truncate font-semibold">
                          {activeItem.name}
                        </span>
                      </OverflowTooltip>
                    </div>
                  </>
                )
              ) : (
                "Select a client"
              )}
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuItem
              className="gap-2 p-2"
              onClick={() => onClientSwitch(idSpecUtils.ofAll())}
            >
              <Avatar asChild className="size-6">
                <div className="flex size-4 items-center justify-center rounded-sm border border-slate-800">
                  <AvatarFallback className={cn("text-sm", allClasses)}>
                    <Users />
                  </AvatarFallback>
                </div>
              </Avatar>
              All clients
              <DropdownMenuShortcut>⌘0</DropdownMenuShortcut>
            </DropdownMenuItem>

            <DropdownMenuLabel className="text-xs text-slate-500 dark:text-slate-400">
              Clients
            </DropdownMenuLabel>
            {clients.map((client, index) => (
              <DropdownMenuItem
                key={client.name}
                onClick={() => onClientSwitch(client.id)}
                className="gap-2 p-2"
              >
                <Avatar
                  className="size-4"
                  asChild
                  key={
                    client.avatarUrl /* Remount Avatar if conditional rendering issues occur */
                  }
                >
                  <div className="flex size-6 items-center justify-center rounded-sm border">
                    {client.avatarUrl && (
                      <AvatarImage src={client.avatarUrl} alt={client.name} />
                    )}
                    <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
                  </div>
                </Avatar>
                {client.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-slate-500 dark:text-slate-400">
                Add client
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
