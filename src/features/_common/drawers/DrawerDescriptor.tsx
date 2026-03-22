import type { FrontServices } from "@/core/frontServices.ts";
import type { ReactNode } from "react";

/**
 * Drawers receive the same service bundle as the app shell (`EntityDrawerRouteLayout`
 * passes `props.services`), so descriptors may use any front service (e.g. report
 * generation from the iteration drawer).
 */
export type DrawerDescriptorServices = FrontServices;

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
