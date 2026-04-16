import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useEntityDrawerContext } from "@/features/_common/drawers/entityDrawerContext.tsx";
import type {
  DrawerDescriptor,
  DrawerDescriptorServices,
} from "@/features/_common/drawers/DrawerDescriptor.tsx";
import { createErrorRenderer } from "@/features/_common/renderError.tsx";
import { BulkCreateCostPanel } from "@/features/reports/BulkCreateCostDrawer.tsx";
import { maybe, rd } from "@passionware/monads";

export type BulkCreateCostForReportsSpec = {
  type: "bulk-create-cost-for-reports";
  reportIds: number[];
  afterCreate?: () => void;
};

function BulkCreateCostForReportsDrawerBody({
  entity,
  services,
}: {
  entity: BulkCreateCostForReportsSpec;
  services: DrawerDescriptorServices;
}) {
  const { popEntityDrawer, pushEntityDrawer } = useEntityDrawerContext();
  const entriesRd = services.reportDisplayService.useReportViewEntriesByIds(
    maybe.fromArray(entity.reportIds),
  );

  return rd
    .journey(entriesRd)
    .wait(
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-1">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>,
    )
    .catch(createErrorRenderer("w-full max-w-md"))
    .map((reports) => (
      <BulkCreateCostPanel
        services={services}
        selectedReports={reports}
        onCancel={() => popEntityDrawer()}
        onCompleted={(createdCostId) => {
          entity.afterCreate?.();
          popEntityDrawer();
          pushEntityDrawer({ type: "cost", id: createdCostId });
        }}
      />
    ));
}

export const bulkCreateCostForReportsDrawerDescriptor: DrawerDescriptor<BulkCreateCostForReportsSpec> =
  {
    getKey: (entity) =>
      `bulk-create-cost-for-reports:${[...entity.reportIds].sort((a, b) => a - b).join(",")}`,
    getLabel: () => "Create cost",
    getTitle: () => "Create cost for selected reports",
    renderBreadcrumbLabel: (_entity, _services) => <>Create cost</>,
    renderSmallPreview: (_entity, _services) => null,
    renderDrawerContent: (entity, services) => (
      <BulkCreateCostForReportsDrawerBody entity={entity} services={services} />
    ),
  };
