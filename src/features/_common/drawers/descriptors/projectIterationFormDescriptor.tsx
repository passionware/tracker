import type { ProjectIterationPayload } from "@/api/project-iteration/project-iteration.api.ts";
import type {
  DrawerDescriptor,
  DrawerDescriptorServices,
} from "../DrawerDescriptor";
import { useEntityDrawerContext } from "../entityDrawerContext.tsx";
import { ProjectIterationForm } from "@/features/project-iterations/IterationForm.tsx";

export type ProjectIterationFormSpec = {
  type: "project-iteration-form";
  projectIterationId: number;
  defaultValues: ProjectIterationPayload;
};

function ProjectIterationFormDrawerContent({
  entity,
  services,
}: {
  entity: ProjectIterationFormSpec;
  services: DrawerDescriptorServices;
}) {
  const { popEntityDrawer } = useEntityDrawerContext();
  return (
    <div className="flex min-h-0 flex-1 flex-col p-1">
      <ProjectIterationForm
        mode="edit"
        defaultValues={entity.defaultValues}
        onCancel={() => popEntityDrawer?.()}
        onSubmit={async (_data, changes) => {
          await services.mutationService.editProjectIteration(
            entity.projectIterationId,
            changes,
          );
          popEntityDrawer?.();
        }}
      />
    </div>
  );
}

export const projectIterationFormDrawerDescriptor = {
  getKey: (entity) =>
    `project-iteration-form-${entity.projectIterationId}`,
  getLabel: (_entity) => "Edit iteration",
  getTitle: (_entity) => "Edit iteration",
  renderBreadcrumbLabel: (_entity, _services) => "Edit iteration",
  renderSmallPreview: (_entity, _services) => null,
  renderDrawerContent: (entity, services) => (
    <ProjectIterationFormDrawerContent entity={entity} services={services} />
  ),
} satisfies DrawerDescriptor<ProjectIterationFormSpec>;
