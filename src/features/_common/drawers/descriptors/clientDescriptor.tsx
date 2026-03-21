import {
  type ClientDrawerSpec,
  ClientDrawerBreadcrumbLabel,
  ClientDrawerBody,
  ClientDrawerHeaderActions,
  ClientDrawerSmallPreview,
} from "@/features/clients/clientDrawerViews.tsx";
import type { DrawerDescriptor } from "../DrawerDescriptor";

export const clientDrawerDescriptor: DrawerDescriptor<ClientDrawerSpec> = {
  getKey: (entity) => `client-${entity.id}`,
  getLabel: (entity) => `Client #${entity.id}`,
  getTitle: (_entity) => "Client details",
  renderBreadcrumbLabel: (entity, services) => (
    <ClientDrawerBreadcrumbLabel entity={entity} services={services} />
  ),
  renderSmallPreview: (entity, services) => (
    <ClientDrawerSmallPreview entity={entity} services={services} />
  ),
  renderDrawerContent: (entity, services) => (
    <ClientDrawerBody entity={entity} services={services} />
  ),
  renderHeaderActions: (entity, services) => (
    <ClientDrawerHeaderActions entity={entity} services={services} />
  ),
};
