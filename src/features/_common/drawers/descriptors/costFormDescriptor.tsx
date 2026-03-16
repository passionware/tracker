import type { CostPayload } from "@/api/cost/cost.api";
import type {
  DrawerDescriptor,
  DrawerDescriptorServices,
} from "../DrawerDescriptor";
import { useEntityDrawerContext } from "../entityDrawerContext.tsx";
import { CostForm } from "@/features/costs/CostForm.tsx";

export type CostFormSpec = {
  type: "cost-form";
  id: number;
  mode: "edit" | "duplicate";
  defaultValues: CostPayload;
};

function CostFormDrawerContent({
  entity,
  services,
}: {
  entity: CostFormSpec;
  services: DrawerDescriptorServices;
}) {
  const { popEntityDrawer } = useEntityDrawerContext();
  const handleCancel = () => popEntityDrawer?.();
  return (
    <CostForm
      defaultValues={entity.defaultValues}
      services={services}
      onCancel={handleCancel}
      onSubmit={async (
        payload: CostPayload,
        changes: Partial<CostPayload>,
      ) => {
        if (entity.mode === "edit") {
          await services.mutationService.editCost(entity.id, changes);
        } else {
          await services.mutationService.createCost(payload);
        }
        popEntityDrawer?.();
      }}
    />
  );
}

export const costFormDrawerDescriptor: DrawerDescriptor<CostFormSpec> = {
  getKey: (entity) => `cost-form-${entity.id}-${entity.mode}`,
  getLabel: (entity) =>
    entity.mode === "edit" ? "Edit cost" : "Duplicate cost",
  getTitle: (entity) =>
    entity.mode === "edit" ? "Edit cost" : "Duplicate cost",
  renderBreadcrumbLabel: (entity) =>
    entity.mode === "edit" ? "Edit cost" : "Duplicate cost",
  renderSmallPreview: () => null,
  renderDrawerContent: (entity, services) => (
    <CostFormDrawerContent entity={entity} services={services} />
  ),
};
