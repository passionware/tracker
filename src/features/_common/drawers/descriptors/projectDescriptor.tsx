import {
  type ProjectDrawerSpec,
  ProjectDrawerBreadcrumbLabel,
  ProjectDrawerBody,
  ProjectDrawerHeaderActions,
  ProjectDrawerSmallPreview,
} from "@/features/projects/projectDrawerViews.tsx";
import type { DrawerDescriptor } from "../DrawerDescriptor";

export const projectDrawerDescriptor: DrawerDescriptor<ProjectDrawerSpec> = {
  getKey: (entity) => `project-${entity.id}`,
  getLabel: (entity) => `Project #${entity.id}`,
  getTitle: (_entity) => "Project details",
  renderBreadcrumbLabel: (entity, services) => (
    <ProjectDrawerBreadcrumbLabel entity={entity} services={services} />
  ),
  renderSmallPreview: (entity, services) => (
    <ProjectDrawerSmallPreview entity={entity} services={services} />
  ),
  renderDrawerContent: (entity, services) => (
    <ProjectDrawerBody entity={entity} services={services} />
  ),
  renderHeaderActions: (entity, services) => (
    <ProjectDrawerHeaderActions entity={entity} services={services} />
  ),
};
