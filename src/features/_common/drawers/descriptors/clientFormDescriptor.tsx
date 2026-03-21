import { ClientForm, type ClientFormValues } from "@/features/clients/ClientForm.tsx";
import { ClientDrawerHeaderPreview } from "@/features/clients/clientDrawerViews.tsx";
import type {
  DrawerDescriptor,
  DrawerDescriptorServices,
} from "../DrawerDescriptor";
import { useEntityDrawerContext } from "../entityDrawerContext.tsx";

export type ClientFormSpec = {
  type: "client-form";
  clientId: number;
  defaultValues: Pick<
    ClientFormValues,
    "name" | "senderName" | "avatarUrl" | "hidden"
  >;
};

function ClientFormDrawerContent({
  entity,
  services,
}: {
  entity: ClientFormSpec;
  services: DrawerDescriptorServices;
}) {
  const { popEntityDrawer } = useEntityDrawerContext();
  const handleCancel = () => popEntityDrawer?.();
  return (
    <ClientForm
      layout="bulkCostDrawer"
      mode="edit"
      clientId={entity.clientId}
      services={services}
      defaultValues={entity.defaultValues}
      onCancel={handleCancel}
      onSubmit={async (clientId, payload) => {
        await services.mutationService.updateClient(clientId, payload);
        popEntityDrawer?.();
      }}
    />
  );
}

export const clientFormDrawerDescriptor = {
  getKey: (entity) => `client-form-${entity.clientId}`,
  /** Short crumb; full phrase stays in `DrawerTitle`. */
  getLabel: (_entity) => "Edit",
  getTitle: (_entity) => "Edit client",
  renderBreadcrumbLabel: (_entity) => "Edit",
  renderSmallPreview: (entity, services) => (
    <ClientDrawerHeaderPreview clientId={entity.clientId} services={services} />
  ),
  renderDrawerContent: (entity, services) => (
    <ClientFormDrawerContent entity={entity} services={services} />
  ),
} satisfies DrawerDescriptor<ClientFormSpec>;
