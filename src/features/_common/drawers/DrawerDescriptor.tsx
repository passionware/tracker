import type { ReactNode } from "react";
import type { DrawerServices } from "./drawerTypes";

/** The merged services object (DrawerServices.services) passed to descriptor methods. */
export type DrawerDescriptorServices = DrawerServices["services"];

export type DrawerDescriptor<EntitySpec> = {
  getKey: (entity: EntitySpec) => string;
  getLabel: (entity: EntitySpec) => string;
  getTitle: (entity: EntitySpec) => string;
  renderBreadcrumbLabel: (
    entity: EntitySpec,
    services: DrawerDescriptorServices,
  ) => ReactNode;
  renderSmallPreview: (
    entity: EntitySpec,
    services: DrawerDescriptorServices,
  ) => ReactNode;
  renderDrawerContent: (
    entity: EntitySpec,
    services: DrawerDescriptorServices,
  ) => ReactNode;
  /** Optional: CommitStatusBadge + ActionMenu (edit, delete, duplicate, etc.). */
  renderHeaderActions?: (
    entity: EntitySpec,
    services: DrawerDescriptorServices,
  ) => ReactNode;
};
