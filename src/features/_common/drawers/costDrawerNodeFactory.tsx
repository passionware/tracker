import type { CostPayload } from "@/api/cost/cost.api";
import {
  ActionMenu,
  ActionMenuCopyItem,
  ActionMenuDeleteItem,
  ActionMenuDuplicateItem,
  ActionMenuEditItem,
} from "@/features/_common/ActionMenu.tsx";
import { CommitStatusBadge } from "@/features/_common/elements/CommitStatusBadge.tsx";
import { CostForm } from "@/features/costs/CostForm.tsx";
import { CostInfo } from "@/features/_common/info/CostInfo.tsx";
import { idSpecUtils } from "@/platform/lang/IdSpec.ts";
import type { CostEntry } from "@/services/front/ReportDisplayService/ReportDisplayService.ts";
import { DrawerMainInfoGrid } from "./DrawerMainInfoGrid.tsx";
import type {
  DrawerContext,
  DrawerServices,
} from "./entityDrawerNodeFactory.types";
import { getCreateNode } from "./entityDrawerCreateNode";
import type { EntityDrawerNode } from "./useEntityDrawerState";

export type CostDetailEntity = { type: "cost"; id: number };

export type CostFormEntity = {
  type: "cost-form";
  id: number;
  mode: "edit" | "duplicate";
  defaultValues: CostPayload;
};

export type CostDrawerEntity = CostDetailEntity | CostFormEntity;

// ----- Detail factory -----

export type CostDetailDrawerFactoryDeps = DrawerServices & {
  costById: Map<number, CostEntry>;
  context: DrawerContext;
  pushEntityDrawer: (node: EntityDrawerNode) => void;
  popEntityDrawer?: () => void;
};

function renderUnavailableCost() {
  return (
    <div className="text-sm text-muted-foreground">
      Selected entity is not available in current list scope.
    </div>
  );
}

export function createCostDetailDrawerNodeFactory(
  deps: CostDetailDrawerFactoryDeps,
): (entity: CostDetailEntity) => EntityDrawerNode {
  const { costById, context, services, pushEntityDrawer, popEntityDrawer } =
    deps;
  const createNode = getCreateNode();

  return (entity) => {
    const cost = costById.get(entity.id);
    if (!cost) {
      return {
        key: `cost-${entity.id}`,
        entity: { type: "cost", id: entity.id },
        label: `Cost #${entity.id}`,
        title: "Cost details",
        render: () => renderUnavailableCost(),
      };
    }

    return {
      key: `cost-${entity.id}`,
      entity: { type: "cost", id: entity.id },
      label: `Cost #${entity.id}`,
      title: "Cost details",
      renderHeaderActions: () => (
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
                pushEntityDrawer(
                  createNode({
                    type: "cost-form",
                    id: entity.id,
                    mode: "edit",
                    defaultValues: cost.originalCost,
                  }),
                )
              }
            >
              Edit Cost
            </ActionMenuEditItem>
            <ActionMenuDuplicateItem
              onClick={() =>
                pushEntityDrawer(
                  createNode({
                    type: "cost-form",
                    id: entity.id,
                    mode: "duplicate",
                    defaultValues: cost.originalCost,
                  }),
                )
              }
            >
              Duplicate Cost
            </ActionMenuDuplicateItem>
            <ActionMenuCopyItem copyText={entity.id.toString()}>
              Copy cost ID
            </ActionMenuCopyItem>
          </ActionMenu>
        </div>
      ),
      renderMainInfo: () => (
        <DrawerMainInfoGrid
          items={[
            {
              label: "Workspace",
              value: cost.workspace.name || `#${cost.workspace.id}`,
            },
            { label: "Contractor", value: cost.contractor?.fullName || "-" },
            {
              label: "Invoice date",
              value: services.formatService.temporal.single.compact(
                cost.invoiceDate,
              ),
            },
            { label: "Status", value: cost.status },
          ]}
        />
      ),
      render: () => (
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
            pushEntityDrawer(createNode({ type: "report", id: reportId }))
          }
        />
      ),
    };
  };
}

// ----- Form factory -----

export type CostFormDrawerFactoryDeps = DrawerServices & {
  popEntityDrawer?: () => void;
};

export function createCostFormDrawerNodeFactory(
  deps: CostFormDrawerFactoryDeps,
): (entity: CostFormEntity) => EntityDrawerNode {
  const { services, popEntityDrawer } = deps;

  return (entity) => {
    const handleCancel = () => popEntityDrawer?.();
    return {
      key: `cost-form-${entity.id}-${entity.mode}`,
      label: entity.mode === "edit" ? "Edit cost" : "Duplicate cost",
      title: entity.mode === "edit" ? "Edit cost" : "Duplicate cost",
      render: () => (
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
      ),
    };
  };
}
