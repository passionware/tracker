import type { ProjectPayload } from "@/api/project/project.api.ts";
import type {
  DrawerDescriptor,
  DrawerDescriptorServices,
} from "../DrawerDescriptor";
import { useEntityDrawerContext } from "../entityDrawerContext.tsx";
import { ProjectForm } from "@/features/projects/_common/ProjectForm.tsx";
import { ProjectDrawerHeaderPreview } from "@/features/projects/projectDrawerViews.tsx";

export type ProjectFormSpec = {
  type: "project-form";
  projectId: number;
  defaultValues: ProjectPayload;
};

function ProjectFormDrawerContent({
  entity,
  services,
}: {
  entity: ProjectFormSpec;
  services: DrawerDescriptorServices;
}) {
  const { popEntityDrawer } = useEntityDrawerContext();
  const handleCancel = () => popEntityDrawer?.();
  return (
    <ProjectForm
      layout="bulkCostDrawer"
      mode="edit"
      services={services}
      defaultValues={entity.defaultValues}
      onCancel={handleCancel}
      onSubmit={async (_data, changes) => {
        await services.mutationService.editProject(
          entity.projectId,
          changes,
        );
        popEntityDrawer?.();
      }}
    />
  );
}

export const projectFormDrawerDescriptor = {
  getKey: (entity) => `project-form-${entity.projectId}`,
  /** Short crumb; full phrase stays in `DrawerTitle`. */
  getLabel: (_entity) => "Edit",
  getTitle: (_entity) => "Edit project",
  renderBreadcrumbLabel: (_entity) => "Edit",
  renderSmallPreview: (entity, services) => (
    <ProjectDrawerHeaderPreview projectId={entity.projectId} services={services} />
  ),
  renderDrawerContent: (entity, services) => (
    <ProjectFormDrawerContent entity={entity} services={services} />
  ),
} satisfies DrawerDescriptor<ProjectFormSpec>;
