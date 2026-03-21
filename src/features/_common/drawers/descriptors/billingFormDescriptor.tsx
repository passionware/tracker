import type { BillingInvoicePayload } from "@/api/billing/billing.api.ts";
import type {
  DrawerDescriptor,
  DrawerDescriptorServices,
} from "../DrawerDescriptor";
import { useEntityDrawerContext } from "../entityDrawerContext.tsx";
import { BillingForm } from "@/features/billing/BillingForm.tsx";

export type BillingFormSpec = {
  type: "billing-form";
  id: number;
  mode: "edit" | "duplicate";
  defaultValues: Partial<BillingInvoicePayload>;
};

function BillingFormDrawerContent({
  entity,
  services,
}: {
  entity: BillingFormSpec;
  services: DrawerDescriptorServices;
}) {
  const { popEntityDrawer } = useEntityDrawerContext();
  const handleCancel = () => popEntityDrawer?.();
  return (
    <BillingForm
      defaultValues={entity.defaultValues}
      services={services}
      onCancel={handleCancel}
      onSubmit={async (
        payload: BillingInvoicePayload,
        changes: Partial<BillingInvoicePayload>,
      ) => {
        if (entity.mode === "edit") {
          await services.mutationService.editBilling(entity.id, changes);
        } else {
          await services.mutationService.createBilling(payload);
        }
        popEntityDrawer?.();
      }}
    />
  );
}

export const billingFormDrawerDescriptor = {
  getKey: (entity) => `billing-form-${entity.id}-${entity.mode}`,
  getLabel: (entity) =>
    entity.mode === "edit" ? "Edit billing" : "Duplicate billing",
  getTitle: (entity) =>
    entity.mode === "edit" ? "Edit billing" : "Duplicate billing",
  renderBreadcrumbLabel: (entity) =>
    entity.mode === "edit" ? "Edit billing" : "Duplicate billing",
  renderSmallPreview: () => null,
  renderDrawerContent: (entity, services) => (
    <BillingFormDrawerContent entity={entity} services={services} />
  ),
} satisfies DrawerDescriptor<BillingFormSpec>;
