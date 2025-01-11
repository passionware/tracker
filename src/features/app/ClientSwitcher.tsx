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
import { getInitials } from "@/platform/lang/getInitials.ts";
import { ClientSpec } from "@/services/front/RoutingService/RoutingService.ts";
import { ChevronsUpDown, Plus } from "lucide-react";

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

  const activeItem = clients.find((client) => client.id === activeClient);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {activeItem ? (
                <>
                  <Avatar asChild>
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      {activeItem.avatarUrl && (
                        <AvatarImage
                          src={activeItem.avatarUrl}
                          alt={activeItem.name}
                        />
                      )}
                      <AvatarFallback>
                        {getInitials(activeItem.name)}
                      </AvatarFallback>
                    </div>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {activeItem.name}
                    </span>
                    {/*<span className="truncate text-xs">{activeItem.plan}</span>*/}
                  </div>
                </>
              ) : (
                "Select a client"
              )}
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-slate-500 dark:text-slate-400">
              Clients
            </DropdownMenuLabel>
            {clients.map((client, index) => (
              <DropdownMenuItem
                key={client.name}
                onClick={() => onClientSwitch(client.id)}
                className="gap-2 p-2"
              >
                <Avatar className="size-4" asChild>
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
