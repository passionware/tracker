import { Workspace } from "@/api/workspace/workspace.api.ts";
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
import { WorkspaceSpec } from "@/services/front/RoutingService/RoutingService.ts";
import { ChevronsUpDown, Orbit, Plus } from "lucide-react";

export type WorkspaceSwitcherProps = {
  workspaces: Workspace[];
  activeWorkspace: WorkspaceSpec;
  onWorkspaceSwitch: (workspace: WorkspaceSpec) => void;
};

export function WorkspaceSwitcher({
  workspaces,
  onWorkspaceSwitch,
  activeWorkspace,
}: WorkspaceSwitcherProps) {
  const { isMobile } = useSidebar();

  if (workspaces.length === 0) {
    console.error("No workspaces found");
  }

  const activeItem = idSpecUtils.isAll(activeWorkspace)
    ? activeWorkspace
    : workspaces.find((workspace) => workspace.id === activeWorkspace);

  const allClasses =
    "bg-linear-to-tl from-amber-600 to-emerald-600 text-white rounded-none";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="rounded-xl py-7 border border-emerald-500/20 bg-linear-to-tl from-sky-300/10 dark:from-sky-300/20 to-yellow-500/10 dark:to-yellow-500/20 outline-hidden focus-visible:ring-2 focus:ring-emerald-500/20"
            >
              {activeItem ? (
                idSpecUtils.isAll(activeItem) ? (
                  <>
                    <Avatar asChild>
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <AvatarFallback className={allClasses}>
                          <Orbit />
                        </AvatarFallback>
                      </div>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        All workspaces
                      </span>
                      {/*<span className="truncate text-xs">{activeItem.plan}</span>*/}
                    </div>
                  </>
                ) : (
                  <>
                    <Avatar
                      asChild
                      key={
                        activeItem.avatarUrl /* something wrong happens to Avatar if we conditionally render AvatarImage, hence key used to force remount */
                      }
                    >
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary dark:bg-sidebar-accent text-sidebar-primary-foreground">
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
                      <OverflowTooltip title={activeItem.name}>
                        <span className="truncate font-semibold">
                          {activeItem.name}
                        </span>
                      </OverflowTooltip>
                      {/*<span className="truncate text-xs">{activeItem.plan}</span>*/}
                    </div>
                  </>
                )
              ) : (
                "Select workspace"
              )}
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuItem
              className="gap-2 p-2"
              onClick={() => onWorkspaceSwitch(idSpecUtils.ofAll())}
            >
              <Avatar asChild className="size-6">
                <div className="flex size-4 items-center justify-center rounded-sm border border-slate-800">
                  <AvatarFallback className={cn("text-sm", allClasses)}>
                    <Orbit />
                  </AvatarFallback>
                </div>
              </Avatar>
              All workspaces
              <DropdownMenuShortcut>⌘0</DropdownMenuShortcut>
            </DropdownMenuItem>

            <DropdownMenuLabel className="text-xs text-slate-500 dark:text-slate-400">
              Workspaces
            </DropdownMenuLabel>
            {workspaces.map((workspace, index) => (
              <DropdownMenuItem
                key={workspace.name}
                onClick={() => onWorkspaceSwitch(workspace.id)}
                className="gap-2 p-2"
              >
                <Avatar className="size-4" asChild>
                  <div className="flex size-6 items-center justify-center rounded-sm border">
                    {workspace.avatarUrl && (
                      <AvatarImage
                        src={workspace.avatarUrl}
                        alt={workspace.name}
                      />
                    )}
                    <AvatarFallback className="rounded-sm">
                      {getInitials(workspace.name)}
                    </AvatarFallback>
                  </div>
                </Avatar>
                {workspace.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-slate-500 dark:text-slate-400">
                Add workspace
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
