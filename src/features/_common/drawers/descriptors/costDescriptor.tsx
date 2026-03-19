import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  ActionMenu,
  ActionMenuCopyItem,
  ActionMenuDeleteItem,
  ActionMenuDuplicateItem,
  ActionMenuEditItem,
} from "@/features/_common/ActionMenu.tsx";
import { CommitStatusBadge } from "@/features/_common/elements/CommitStatusBadge.tsx";
import { CostInfo } from "@/features/_common/info/CostInfo.tsx";
import { renderSmallError } from "@/features/_common/renderError";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import { rd } from "@passionware/monads";
import type {
  DrawerDescriptor,
  DrawerDescriptorServices,
} from "../DrawerDescriptor";
import { DrawerMainInfoGrid } from "../DrawerMainInfoGrid.tsx";
import { useEntityDrawerContext } from "../entityDrawerContext.tsx";

export type CostSpec = { type: "cost"; id: number };

function renderCostStatusBadge(
  status: "matched" | "unmatched" | "partially-matched" | "overmatched",
) {
  const variant = (
    {
      matched: "positive",
      unmatched: "destructive",
      "partially-matched": "warning",
      overmatched: "accent1",
    } as const
  )[status];
  const label = (
    {
      matched: "Matched",
      unmatched: "Unmatched",
      "partially-matched": "Partially Matched",
      overmatched: "Overmatched",
    } as const
  )[status];

  return (
    <Badge variant={variant} tone="secondary" size="sm">
      {label}
    </Badge>
  );
}

function CostBreadcrumbLabel({
  entity,
  services,
}: {
  entity: CostSpec;
  services: DrawerDescriptorServices;
}) {
  const costRd = services.reportDisplayService.useCostEntry(entity.id);
  return rd
    .journey(costRd)
    .wait(<Skeleton className="h-4 w-24" />)
    .catch(renderSmallError("h-4 w-24"))
    .map((cost) => (
      <>{cost.invoiceNumber ?? cost.description ?? `Cost #${entity.id}`}</>
    ));
}

function CostSmallPreview({
  entity,
  services,
}: {
  entity: CostSpec;
  services: DrawerDescriptorServices;
}) {
  const costRd = services.reportDisplayService.useCostEntry(entity.id);
  return rd
    .journey(costRd)
    .wait(<Skeleton className="h-16 w-48" />)
    .catch(renderSmallError("h-16 w-48"))
    .map((cost) => {
      const workspaceLabel =
        (cost.workspace.name && cost.workspace.name.trim()) ||
        `#${cost.workspace.id}`;
      const contractorLabel =
        (cost.contractor?.fullName && cost.contractor.fullName.trim()) || "-";
      const invoiceDateLabel = services.formatService.temporal.single.compact(
        cost.invoiceDate,
      );
      return (
        <DrawerMainInfoGrid
          items={[
            { label: "Workspace", value: workspaceLabel },
            { label: "Contractor", value: contractorLabel },
            { label: "Invoice date", value: invoiceDateLabel },
            { label: "Status", value: renderCostStatusBadge(cost.status) },
          ]}
        />
      );
    });
}

function CostHeaderActions({
  entity,
  services,
}: {
  entity: CostSpec;
  services: DrawerDescriptorServices;
}) {
  const { pushEntityDrawer, popEntityDrawer } = useEntityDrawerContext();
  const costRd = services.reportDisplayService.useCostEntry(entity.id);
  const cost = rd.tryGet(costRd);
  if (cost == null) return null;
  return (
    <div className="flex items-center gap-2">
      <CommitStatusBadge
        id={cost.id}
        isCommitted={cost.originalCost.isCommitted}
        entityType="cost"
        services={services}
      />
      <ActionMenu services={services}>
        <ActionMenuDeleteItem
          onClick={() => {
            void services.mutationService.deleteCost(entity.id);
            popEntityDrawer?.();
          }}
        >
          Delete Cost
        </ActionMenuDeleteItem>
        <ActionMenuEditItem
          onClick={() =>
            pushEntityDrawer({
              type: "cost-form",
              id: entity.id,
              mode: "edit",
              defaultValues: cost.originalCost,
            })
          }
        >
          Edit Cost
        </ActionMenuEditItem>
        <ActionMenuDuplicateItem
          onClick={() =>
            pushEntityDrawer({
              type: "cost-form",
              id: entity.id,
              mode: "duplicate",
              defaultValues: cost.originalCost,
            })
          }
        >
          Duplicate Cost
        </ActionMenuDuplicateItem>
        <ActionMenuCopyItem copyText={entity.id.toString()}>
          Copy cost ID
        </ActionMenuCopyItem>
      </ActionMenu>
    </div>
  );
}

function CostDrawerContent({
  entity,
  services,
}: {
  entity: CostSpec;
  services: DrawerDescriptorServices;
}) {
  const { context, pushEntityDrawer } = useEntityDrawerContext();
  const costRd = services.reportDisplayService.useCostEntry(entity.id);
  return rd
    .journey(costRd)
    .wait(
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>,
    )
    .catch(renderSmallError("min-h-24 w-full"))
    .map((cost) => (
      <CostInfo
        costEntry={cost}
        clientId={idSpecUtils.mapSpecificOrElse(
          context.clientId,
          (x) => x,
          idSpecUtils.ofAll(),
        )}
        workspaceId={idSpecUtils.mapSpecificOrElse(
          context.workspaceId,
          (x) => x,
          idSpecUtils.ofAll(),
        )}
        services={services}
        onOpenReportDetails={(reportId) =>
          pushEntityDrawer({ type: "report", id: reportId })
        }
      />
    ));
}

export const costDrawerDescriptor = {
  getKey: (entity) => `cost-${entity.id}`,
  getLabel: (entity) => `Cost #${entity.id}`,
  getTitle: () => "Cost details",
  renderBreadcrumbLabel: (entity, services) => (
    <CostBreadcrumbLabel entity={entity} services={services} />
  ),
  renderSmallPreview: (entity, services) => (
    <CostSmallPreview entity={entity} services={services} />
  ),
  renderDrawerContent: (entity, services) => (
    <CostDrawerContent entity={entity} services={services} />
  ),
  renderHeaderActions: (entity, services) => (
    <CostHeaderActions entity={entity} services={services} />
  ),
} satisfies DrawerDescriptor<CostSpec>;
