import type { WorkspaceFormValues } from "@/features/workspaces/WorkspaceForm.tsx";
import { WorkspaceForm } from "@/features/workspaces/WorkspaceForm.tsx";
import { WorkspaceDrawerHeaderPreview } from "@/features/workspaces/workspaceDrawerViews.tsx";
import type {
  DrawerDescriptor,
  DrawerDescriptorServices,
} from "../DrawerDescriptor";
import { useEntityDrawerContext } from "../entityDrawerContext.tsx";

export type WorkspaceFormSpec = {
  type: "workspace-form";
  workspaceId: number;
  defaultValues: Pick<
    WorkspaceFormValues,
    "name" | "slug" | "avatarUrl" | "hidden"
  >;
};

function WorkspaceFormDrawerContent({
  entity,
  services,
}: {
  entity: WorkspaceFormSpec;
  services: DrawerDescriptorServices;
}) {
  const { popEntityDrawer } = useEntityDrawerContext();
  const handleCancel = () => popEntityDrawer?.();
  return (
    <WorkspaceForm
      layout="bulkCostDrawer"
      workspaceId={entity.workspaceId}
      defaultValues={entity.defaultValues}
      onCancel={handleCancel}
      onSubmit={async (workspaceId, payload) => {
        await services.mutationService.updateWorkspace(workspaceId, payload);
        popEntityDrawer?.();
      }}
    />
  );
}

export const workspaceFormDrawerDescriptor = {
  getKey: (entity) => `workspace-form-${entity.workspaceId}`,
  /** Short crumb; full phrase stays in `DrawerTitle`. */
  getLabel: (_entity) => "Edit",
  getTitle: (_entity) => "Edit workspace",
  renderBreadcrumbLabel: (_entity) => "Edit",
  renderSmallPreview: (entity, services) => (
    <WorkspaceDrawerHeaderPreview
      workspaceId={entity.workspaceId}
      services={services}
    />
  ),
  renderDrawerContent: (entity, services) => (
    <WorkspaceFormDrawerContent entity={entity} services={services} />
  ),
} satisfies DrawerDescriptor<WorkspaceFormSpec>;
