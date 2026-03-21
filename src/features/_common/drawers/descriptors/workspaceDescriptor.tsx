import {
  type WorkspaceDrawerSpec,
  WorkspaceDrawerBreadcrumbLabel,
  WorkspaceDrawerBody,
  WorkspaceDrawerHeaderActions,
  WorkspaceDrawerSmallPreview,
} from "@/features/workspaces/workspaceDrawerViews.tsx";
import type { DrawerDescriptor } from "../DrawerDescriptor";

export const workspaceDrawerDescriptor: DrawerDescriptor<WorkspaceDrawerSpec> =
  {
    getKey: (entity) => `workspace-${entity.id}`,
    getLabel: (entity) => `Workspace #${entity.id}`,
    getTitle: (_entity) => "Workspace details",
    renderBreadcrumbLabel: (entity, services) => (
      <WorkspaceDrawerBreadcrumbLabel entity={entity} services={services} />
    ),
    renderSmallPreview: (entity, services) => (
      <WorkspaceDrawerSmallPreview entity={entity} services={services} />
    ),
    renderDrawerContent: (entity, services) => (
      <WorkspaceDrawerBody entity={entity} services={services} />
    ),
    renderHeaderActions: (entity, services) => (
      <WorkspaceDrawerHeaderActions entity={entity} services={services} />
    ),
  };
