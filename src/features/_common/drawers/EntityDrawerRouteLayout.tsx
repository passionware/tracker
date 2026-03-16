import type { ReactNode } from "react";
import type { DrawerDescriptorServices } from "./DrawerDescriptor";
import type { ClientSpec, WorkspaceSpec } from "@/services/front/RoutingService/RoutingService.ts";
import { getEntityStackKey } from "./descriptors";
import { EntityDetailDrawers } from "./EntityDetailDrawers.tsx";
import { EntityDrawerProvider } from "./entityDrawerContext.tsx";
import { useEntityDrawerState } from "./useEntityDrawerState.ts";

export interface EntityDrawerRouteLayoutProps {
  clientId: ClientSpec;
  workspaceId: WorkspaceSpec;
  services: DrawerDescriptorServices;
  children: ReactNode;
}

/**
 * Renders EntityDrawerProvider and EntityDetailDrawers once for the route.
 * Use this to wrap report/cost/billing (and similar) pages so widgets only need useEntityDrawerContext().
 */
export function EntityDrawerRouteLayout({
  clientId,
  workspaceId,
  services,
  children,
}: EntityDrawerRouteLayoutProps) {
  const drawerState = useEntityDrawerState({
    getKey: getEntityStackKey,
  });

  return (
    <EntityDrawerProvider
      value={{
        context: { clientId, workspaceId },
        services,
        entityStack: drawerState.entityStack,
        pushEntityDrawer: drawerState.pushEntityDrawer,
        popEntityDrawer: drawerState.popEntityDrawer,
        openEntityDrawer: drawerState.openEntityDrawer,
        closeEntityDrawer: drawerState.closeEntityDrawer,
        jumpToEntityStackIndex: drawerState.jumpToEntityStackIndex,
      }}
    >
      <EntityDetailDrawers />
      {children}
    </EntityDrawerProvider>
  );
}
