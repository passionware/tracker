import type { ReportPayload } from "@/api/reports/reports.api.ts";
import type {
  DrawerDescriptor,
  DrawerDescriptorServices,
} from "../DrawerDescriptor";
import { useEntityDrawerContext } from "../entityDrawerContext.tsx";
import { ReportForm } from "@/features/reports/ReportForm.tsx";

export type ReportFormSpec = {
  type: "report-form";
  id: number;
  mode: "edit" | "duplicate";
  defaultValues: ReportPayload;
};

function ReportFormDrawerContent({
  entity,
  services,
}: {
  entity: ReportFormSpec;
  services: DrawerDescriptorServices;
}) {
  const { popEntityDrawer } = useEntityDrawerContext();
  const handleCancel = () => popEntityDrawer?.();
  return (
    <ReportForm
      defaultValues={entity.defaultValues}
      services={services}
      onCancel={handleCancel}
      onSubmit={async (
        payload: ReportPayload,
        changes: Partial<ReportPayload>,
      ) => {
        if (entity.mode === "edit") {
          await services.mutationService.editReport(entity.id, changes);
        } else {
          await services.mutationService.createReport(payload);
        }
        popEntityDrawer?.();
      }}
    />
  );
}

export const reportFormDrawerDescriptor = {
  getKey: (entity) => `report-form-${entity.id}-${entity.mode}`,
  getLabel: (entity) =>
    entity.mode === "edit" ? "Edit report" : "Duplicate report",
  getTitle: (entity) =>
    entity.mode === "edit" ? "Edit report" : "Duplicate report",
  renderBreadcrumbLabel: (entity) =>
    entity.mode === "edit" ? "Edit report" : "Duplicate report",
  renderSmallPreview: () => null,
  renderDrawerContent: (entity, services) => (
    <ReportFormDrawerContent entity={entity} services={services} />
  ),
} satisfies DrawerDescriptor<ReportFormSpec>;
